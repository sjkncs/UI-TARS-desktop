/**
 * 安全验证器模块
 * 用于验证命令和操作的安全性，防止危险操作
 * 创建日期: 2026-02-11
 * 遵守工信部网络安全风险通知要求
 */

import * as fs from 'fs';
import * as path from 'path';

interface SecurityConfig {
  version: string;
  security: {
    enabled: boolean;
    mode: 'strict' | 'normal';
  };
  workspace: {
    allowed: string[];
  };
  blockedCommands: {
    patterns: string[];
    keywords: string[];
  };
  blockedOperations: Array<{
    type: string;
    action: string;
    paths?: string[];
    description: string;
  }>;
  requiresAuthorization: {
    fileOperations: Record<string, boolean>;
    systemOperations: Record<string, boolean>;
    networkOperations: Record<string, boolean>;
  };
  audit: {
    enabled: boolean;
    logPath: string;
    logLevel: string;
    recordOperations: boolean;
    recordCommands: boolean;
  };
}

export class SecurityValidator {
  private config: SecurityConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'security.config.json');
    this.loadConfig();
  }

  /**
   * 加载安全配置
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
      } else {
        console.warn(`安全配置文件不存在: ${this.configPath}`);
      }
    } catch (error) {
      console.error('加载安全配置失败:', error);
    }
  }

  /**
   * 验证命令是否安全
   */
  public validateCommand(command: string): { safe: boolean; reason?: string } {
    if (!this.config || !this.config.security.enabled) {
      return { safe: true };
    }

    // 检查危险命令模式
    for (const pattern of this.config.blockedCommands.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(command)) {
        return {
          safe: false,
          reason: `命令匹配危险模式: ${pattern}。此操作已被安全策略禁止。`,
        };
      }
    }

    // 检查危险关键字
    for (const keyword of this.config.blockedCommands.keywords) {
      if (command.toLowerCase().includes(keyword.toLowerCase().replace(/\\\\/g, '\\'))) {
        return {
          safe: false,
          reason: `命令包含危险路径: ${keyword}。禁止操作系统关键目录。`,
        };
      }
    }

    return { safe: true };
  }

  /**
   * 验证文件路径是否在允许的工作目录内
   */
  public validatePath(filePath: string): { safe: boolean; reason?: string } {
    if (!this.config || !this.config.security.enabled) {
      return { safe: true };
    }

    const normalizedPath = path.normalize(filePath).toLowerCase();

    // 检查是否在允许的工作目录内
    const isAllowed = this.config.workspace.allowed.some((allowedPath) => {
      const normalizedAllowed = path.normalize(allowedPath).toLowerCase();
      return normalizedPath.startsWith(normalizedAllowed);
    });

    if (!isAllowed) {
      return {
        safe: false,
        reason: `路径 ${filePath} 不在允许的工作目录内。只能操作: ${this.config.workspace.allowed.join(', ')}`,
      };
    }

    // 检查是否是被禁止的系统路径
    const systemPaths = [
      'c:\\windows',
      'c:\\program files',
      'c:\\program files (x86)',
      '/system',
      '/library',
      '/usr/bin',
      '/usr/lib',
      '/etc',
    ];

    for (const sysPath of systemPaths) {
      if (normalizedPath.startsWith(sysPath)) {
        return {
          safe: false,
          reason: `禁止访问系统关键目录: ${sysPath}`,
        };
      }
    }

    return { safe: true };
  }

  /**
   * 验证操作是否需要用户授权
   */
  public requiresAuthorization(
    operationType: 'file' | 'system' | 'network',
    action: string
  ): boolean {
    if (!this.config || !this.config.security.enabled) {
      return false;
    }

    const authConfig = this.config.requiresAuthorization;

    switch (operationType) {
      case 'file':
        return authConfig.fileOperations[action] || false;
      case 'system':
        return authConfig.systemOperations[action] || false;
      case 'network':
        return authConfig.networkOperations[action] || false;
      default:
        return false;
    }
  }

  /**
   * 记录审计日志
   */
  public async auditLog(
    operation: string,
    details: Record<string, any>,
    result: 'success' | 'blocked' | 'error'
  ): Promise<void> {
    if (!this.config || !this.config.audit.enabled) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      result,
    };

    try {
      const logDir = path.dirname(this.config.audit.logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.config.audit.logPath, logLine, 'utf-8');
    } catch (error) {
      console.error('写入审计日志失败:', error);
    }
  }

  /**
   * 获取安全报告
   */
  public getSecurityReport(): string {
    if (!this.config) {
      return '安全配置未加载';
    }

    return `
安全配置状态:
- 安全模式: ${this.config.security.enabled ? this.config.security.mode : '已禁用'}
- 允许的工作目录: ${this.config.workspace.allowed.join(', ')}
- 审计日志: ${this.config.audit.enabled ? '已启用' : '已禁用'}
- 配置版本: ${this.config.version}
    `.trim();
  }

  /**
   * 执行安全审计
   */
  public async performSecurityAudit(): Promise<{
    passed: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.config) {
      issues.push('安全配置文件未找到或加载失败');
      recommendations.push('请创建 security.config.json 文件');
      return { passed: false, issues, recommendations };
    }

    // 检查安全功能是否启用
    if (!this.config.security.enabled) {
      issues.push('安全功能未启用');
      recommendations.push('建议启用安全功能以保护系统');
    }

    // 检查审计日志
    if (!this.config.audit.enabled) {
      issues.push('审计日志未启用');
      recommendations.push('建议启用审计日志以追踪操作历史');
    }

    // 检查工作目录配置
    if (!this.config.workspace.allowed || this.config.workspace.allowed.length === 0) {
      issues.push('未配置允许的工作目录');
      recommendations.push('请配置允许操作的工作目录');
    }

    // 检查日志目录是否存在
    if (this.config.audit.enabled) {
      const logDir = path.dirname(this.config.audit.logPath);
      if (!fs.existsSync(logDir)) {
        recommendations.push(`日志目录不存在，将自动创建: ${logDir}`);
        try {
          fs.mkdirSync(logDir, { recursive: true });
        } catch (error) {
          issues.push(`无法创建日志目录: ${logDir}`);
        }
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// 导出单例实例
export const securityValidator = new SecurityValidator();

// 导出辅助函数
export async function validateCommandSafety(command: string): Promise<{
  safe: boolean;
  reason?: string;
}> {
  const result = securityValidator.validateCommand(command);
  
  await securityValidator.auditLog(
    'command_validation',
    { command },
    result.safe ? 'success' : 'blocked'
  );

  return result;
}

export async function validatePathSafety(filePath: string): Promise<{
  safe: boolean;
  reason?: string;
}> {
  const result = securityValidator.validatePath(filePath);
  
  await securityValidator.auditLog(
    'path_validation',
    { path: filePath },
    result.safe ? 'success' : 'blocked'
  );

  return result;
}

export async function requestUserAuthorization(
  operation: string,
  details: string
): Promise<boolean> {
  console.log('\n⚠️  需要用户授权 ⚠️');
  console.log(`操作: ${operation}`);
  console.log(`详情: ${details}`);
  console.log('\n此操作需要您的明确授权才能继续。');
  console.log('请在应用界面中确认是否允许此操作。\n');

  // 这里应该集成到UI中，让用户确认
  // 目前返回 false，需要手动授权
  return false;
}
