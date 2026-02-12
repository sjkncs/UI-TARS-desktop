/**
 * 安全审计脚本
 * 用于执行安全检查和生成审计报告
 */

const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.configPath = path.join(__dirname, 'security.config.json');
    this.config = null;
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
        return true;
      } else {
        console.error('❌ 安全配置文件不存在:', this.configPath);
        return false;
      }
    } catch (error) {
      console.error('❌ 加载安全配置失败:', error.message);
      return false;
    }
  }

  async performAudit() {
    console.log('🔍 开始安全审计...\n');
    console.log('=' .repeat(60));
    
    if (!this.loadConfig()) {
      return;
    }

    const issues = [];
    const warnings = [];
    const recommendations = [];

    // 1. 检查安全功能状态
    console.log('\n📋 检查安全功能状态...');
    if (!this.config.security.enabled) {
      issues.push('安全功能未启用');
      console.log('  ❌ 安全功能: 已禁用');
    } else {
      console.log(`  ✅ 安全功能: 已启用 (${this.config.security.mode} 模式)`);
    }

    // 2. 检查网关配置
    console.log('\n🌐 检查网关配置...');
    if (this.config.gateway.binding === 'loopback' && this.config.gateway.host === '127.0.0.1') {
      console.log(`  ✅ 网关绑定: ${this.config.gateway.host}:${this.config.gateway.port} (仅本地)`);
    } else {
      warnings.push(`网关可能对外开放: ${this.config.gateway.host}:${this.config.gateway.port}`);
      console.log(`  ⚠️  网关绑定: ${this.config.gateway.host}:${this.config.gateway.port}`);
    }

    // 3. 检查工作目录配置
    console.log('\n📁 检查工作目录配置...');
    if (!this.config.workspace.allowed || this.config.workspace.allowed.length === 0) {
      issues.push('未配置允许的工作目录');
      console.log('  ❌ 工作目录: 未配置');
    } else {
      console.log('  ✅ 允许的工作目录:');
      this.config.workspace.allowed.forEach(dir => {
        const exists = fs.existsSync(dir);
        if (exists) {
          console.log(`     ✅ ${dir}`);
        } else {
          warnings.push(`工作目录不存在: ${dir}`);
          console.log(`     ⚠️  ${dir} (不存在)`);
        }
      });
    }

    // 4. 检查审计日志
    console.log('\n📝 检查审计日志配置...');
    if (!this.config.audit.enabled) {
      issues.push('审计日志未启用');
      console.log('  ❌ 审计日志: 已禁用');
    } else {
      console.log(`  ✅ 审计日志: 已启用`);
      const logDir = path.dirname(this.config.audit.logPath);
      
      if (!fs.existsSync(logDir)) {
        warnings.push(`日志目录不存在: ${logDir}`);
        console.log(`  ⚠️  日志目录: ${logDir} (不存在)`);
        recommendations.push(`创建日志目录: mkdir "${logDir}"`);
      } else {
        console.log(`  ✅ 日志目录: ${logDir}`);
        
        // 检查日志文件
        if (fs.existsSync(this.config.audit.logPath)) {
          const stats = fs.statSync(this.config.audit.logPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`  ℹ️  日志文件大小: ${sizeMB} MB`);
          
          if (stats.size > 100 * 1024 * 1024) { // 100MB
            recommendations.push('日志文件过大，建议清理或归档');
          }
        } else {
          console.log(`  ℹ️  日志文件: 尚未创建`);
        }
      }
    }

    // 5. 检查危险命令规则
    console.log('\n🚫 检查危险命令规则...');
    const patternCount = this.config.blockedCommands.patterns.length;
    const keywordCount = this.config.blockedCommands.keywords.length;
    console.log(`  ✅ 危险命令模式: ${patternCount} 条`);
    console.log(`  ✅ 危险关键字: ${keywordCount} 个`);

    // 6. 检查授权配置
    console.log('\n🔐 检查授权配置...');
    const fileOps = Object.keys(this.config.requiresAuthorization.fileOperations).filter(
      k => this.config.requiresAuthorization.fileOperations[k]
    );
    const sysOps = Object.keys(this.config.requiresAuthorization.systemOperations).filter(
      k => this.config.requiresAuthorization.systemOperations[k]
    );
    const netOps = Object.keys(this.config.requiresAuthorization.networkOperations).filter(
      k => this.config.requiresAuthorization.networkOperations[k]
    );
    
    console.log(`  ✅ 需授权的文件操作: ${fileOps.join(', ') || '无'}`);
    console.log(`  ✅ 需授权的系统操作: ${sysOps.join(', ') || '无'}`);
    console.log(`  ✅ 需授权的网络操作: ${netOps.join(', ') || '无'}`);

    // 7. 分析审计日志
    if (this.config.audit.enabled && fs.existsSync(this.config.audit.logPath)) {
      console.log('\n📊 分析审计日志...');
      try {
        const logContent = fs.readFileSync(this.config.audit.logPath, 'utf-8');
        const lines = logContent.split('\n').filter(l => l.trim());
        
        let blockedCount = 0;
        let errorCount = 0;
        let successCount = 0;
        
        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            if (entry.result === 'blocked') blockedCount++;
            else if (entry.result === 'error') errorCount++;
            else if (entry.result === 'success') successCount++;
          } catch (e) {
            // 忽略解析错误
          }
        });
        
        console.log(`  ℹ️  总记录数: ${lines.length}`);
        console.log(`  ✅ 成功操作: ${successCount}`);
        console.log(`  ⚠️  被拦截: ${blockedCount}`);
        console.log(`  ❌ 错误: ${errorCount}`);
        
        if (blockedCount > 0) {
          warnings.push(`发现 ${blockedCount} 次被拦截的操作尝试`);
        }
      } catch (error) {
        console.log(`  ⚠️  无法分析日志: ${error.message}`);
      }
    }

    // 8. 生成报告
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 审计报告摘要\n');
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ 安全检查通过！未发现问题。\n');
    } else {
      if (issues.length > 0) {
        console.log('❌ 发现的问题:');
        issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
        console.log('');
      }
      
      if (warnings.length > 0) {
        console.log('⚠️  警告:');
        warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
        console.log('');
      }
    }
    
    if (recommendations.length > 0) {
      console.log('💡 建议:');
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
      console.log('');
    }

    console.log('配置版本:', this.config.version);
    console.log('最后更新:', this.config.lastUpdated);
    console.log('\n' + '='.repeat(60));
    
    return {
      passed: issues.length === 0,
      issues,
      warnings,
      recommendations
    };
  }
}

// 运行审计
const auditor = new SecurityAuditor();
auditor.performAudit().catch(console.error);
