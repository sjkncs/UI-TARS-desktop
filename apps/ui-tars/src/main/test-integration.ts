/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 集成测试脚本 - 在真实环境中测试优化功能
 * 
 * 测试内容：
 * 1. 智能重试机制
 * 2. 性能监控系统
 * 3. OCR 文字识别
 */

import { SmartRetryManager } from './services/retryManager';
import { performanceMonitor } from './services/performanceMonitor';
import { ocrService } from './services/ocrService';
// import { NutJSElectronOperator } from './agent/operator';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.cyan);
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// 测试 1: 智能重试机制
// ============================================================================

async function testRetryMechanism() {
  section('测试 1: 智能重试机制');

  const retryManager = new SmartRetryManager();
  let testsPassed = 0;
  let testsFailed = 0;

  // 测试 1.1: 首次成功（无重试）
  try {
    log('测试 1.1: 首次成功（无重试）', colors.blue);
    const result = await performanceMonitor.measure('retry.test1', async () => {
      return await retryManager.executeWithRetry(
        async () => ({ success: true, data: 'test' }),
        (result) => result.success === true,
        { maxRetries: 3, baseDelay: 100 }
      );
    });
    log('✓ 首次成功，无需重试', colors.green);
    log(`  结果: ${JSON.stringify(result)}`, colors.reset);
    testsPassed++;
  } catch (error) {
    log(`✗ 测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  // 测试 1.2: 失败后重试成功
  try {
    log('\n测试 1.2: 失败后重试成功', colors.blue);
    let attempts = 0;
    const result = await performanceMonitor.measure('retry.test2', async () => {
      return await retryManager.executeWithRetry(
        async () => {
          attempts++;
          if (attempts < 2) {
            return { success: false, error: 'Temporary failure' };
          }
          return { success: true, data: 'success after retry' };
        },
        (result) => result.success === true,
        { maxRetries: 3, baseDelay: 100 }
      );
    });
    log(`✓ 重试成功（共 ${attempts} 次尝试）`, colors.green);
    log(`  结果: ${JSON.stringify(result)}`, colors.reset);
    testsPassed++;
  } catch (error) {
    log(`✗ 测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  // 测试 1.3: 达到最大重试次数
  try {
    log('\n测试 1.3: 达到最大重试次数', colors.blue);
    await performanceMonitor.measure('retry.test3', async () => {
      return await retryManager.executeWithRetry(
        async () => ({ success: false, error: 'Persistent failure' }),
        (result) => result.success === true,
        { maxRetries: 2, baseDelay: 100 }
      );
    });
    log('✗ 应该抛出错误但没有', colors.red);
    testsFailed++;
  } catch (error) {
    log('✓ 正确抛出错误（达到最大重试次数）', colors.green);
    log(`  错误信息: ${(error as Error).message}`, colors.reset);
    testsPassed++;
  }

  log(`\n重试机制测试完成: ${testsPassed} 通过, ${testsFailed} 失败`, 
      testsFailed === 0 ? colors.green : colors.yellow);

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// 测试 2: 性能监控系统
// ============================================================================

async function testPerformanceMonitoring() {
  section('测试 2: 性能监控系统');

  let testsPassed = 0;
  let testsFailed = 0;

  // 测试 2.1: 基础计时
  try {
    log('测试 2.1: 基础计时功能', colors.blue);
    
    performanceMonitor.start('manual-timing');
    await new Promise(resolve => setTimeout(resolve, 50));
    const duration = performanceMonitor.end('manual-timing');
    
    if (duration >= 50 && duration < 100) {
      log(`✓ 计时准确: ${duration.toFixed(2)}ms`, colors.green);
      testsPassed++;
    } else {
      log(`✗ 计时不准确: ${duration.toFixed(2)}ms (预期 50-100ms)`, colors.red);
      testsFailed++;
    }
  } catch (error) {
    log(`✗ 测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  // 测试 2.2: 自动测量
  try {
    log('\n测试 2.2: 自动测量功能', colors.blue);
    
    await performanceMonitor.measure('auto-measure', async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return 'test result';
    });
    
    const stats = performanceMonitor.getStats('auto-measure');
    if (stats && stats.count === 1 && stats.average >= 30) {
      log(`✓ 自动测量成功: ${stats.average.toFixed(2)}ms`, colors.green);
      testsPassed++;
    } else {
      log('✗ 自动测量失败', colors.red);
      testsFailed++;
    }
  } catch (error) {
    log(`✗ 测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  // 测试 2.3: 慢操作检测
  try {
    log('\n测试 2.3: 慢操作检测', colors.blue);
    
    await performanceMonitor.measure('slow-operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });
    
    const slowOps = performanceMonitor.getSlowOperations(1000);
    if (slowOps.length > 0 && slowOps[0].name === 'slow-operation') {
      log(`✓ 慢操作检测成功: ${slowOps[0].duration.toFixed(2)}ms`, colors.green);
      testsPassed++;
    } else {
      log('✗ 慢操作检测失败', colors.red);
      testsFailed++;
    }
  } catch (error) {
    log(`✗ 测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  // 测试 2.4: 统计计算
  try {
    log('\n测试 2.4: 统计计算', colors.blue);
    
    // 执行多次操作
    for (let i = 0; i < 5; i++) {
      await performanceMonitor.measure('stats-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10 + i * 5));
      });
    }
    
    const stats = performanceMonitor.getStats('stats-test');
    if (stats && stats.count === 5) {
      log('✓ 统计计算成功:', colors.green);
      log(`  次数: ${stats.count}`, colors.reset);
      log(`  平均: ${stats.average.toFixed(2)}ms`, colors.reset);
      log(`  最小: ${stats.min.toFixed(2)}ms`, colors.reset);
      log(`  最大: ${stats.max.toFixed(2)}ms`, colors.reset);
      log(`  P50: ${stats.p50.toFixed(2)}ms`, colors.reset);
      log(`  P95: ${stats.p95.toFixed(2)}ms`, colors.reset);
      testsPassed++;
    } else {
      log('✗ 统计计算失败', colors.red);
      testsFailed++;
    }
  } catch (error) {
    log(`✗ 测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  // 测试 2.5: 性能报告生成
  try {
    log('\n测试 2.5: 性能报告生成', colors.blue);
    
    const report = performanceMonitor.generateReport();
    if (report.includes('Performance Report') && report.includes('Average:')) {
      log('✓ 性能报告生成成功', colors.green);
      log('\n--- 性能报告预览 ---', colors.cyan);
      const lines = report.split('\n').slice(0, 20);
      lines.forEach(line => console.log(line));
      if (report.split('\n').length > 20) {
        log('... (报告已截断)', colors.yellow);
      }
      testsPassed++;
    } else {
      log('✗ 性能报告生成失败', colors.red);
      testsFailed++;
    }
  } catch (error) {
    log(`✗ 测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  log(`\n性能监控测试完成: ${testsPassed} 通过, ${testsFailed} 失败`, 
      testsFailed === 0 ? colors.green : colors.yellow);

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// 测试 3: OCR 文字识别
// ============================================================================

async function testOCRFunctionality() {
  section('测试 3: OCR 文字识别');

  let testsPassed = 0;
  let testsFailed = 0;

  // 测试 3.1: OCR 初始化
  try {
    log('测试 3.1: OCR 初始化', colors.blue);
    
    await performanceMonitor.measure('ocr.init', async () => {
      await ocrService.initialize(['eng', 'chi_sim']);
    });
    
    if (ocrService.isInitialized()) {
      log('✓ OCR 初始化成功', colors.green);
      testsPassed++;
    } else {
      log('✗ OCR 初始化失败', colors.red);
      testsFailed++;
    }
  } catch (error) {
    log(`✗ OCR 初始化失败: ${error}`, colors.red);
    log('  提示: 确保 tesseract.js 已正确安装', colors.yellow);
    testsFailed++;
  }

  // 测试 3.2: 创建测试图片（简单的文本图片）
  try {
    log('\n测试 3.2: OCR 文字识别（需要真实图片）', colors.blue);
    log('  注意: 此测试需要屏幕截图或测试图片', colors.yellow);
    log('  跳过此测试，建议在应用运行时测试', colors.yellow);
    
    // 如果有 operator，可以尝试截图测试
    // const operator = new NutJSElectronOperator();
    // const screenshot = await operator.screenshot();
    // const results = await ocrService.recognize(screenshot);
    
  } catch (error) {
    log(`  提示: ${error}`, colors.yellow);
  }

  // 测试 3.3: OCR 清理
  try {
    log('\n测试 3.3: OCR 资源清理', colors.blue);
    
    await ocrService.terminate();
    log('✓ OCR 资源清理成功', colors.green);
    testsPassed++;
  } catch (error) {
    log(`✗ OCR 清理失败: ${error}`, colors.red);
    testsFailed++;
  }

  log(`\nOCR 测试完成: ${testsPassed} 通过, ${testsFailed} 失败`, 
      testsFailed === 0 ? colors.green : colors.yellow);
  log('  提示: 完整的 OCR 测试需要在应用运行时进行', colors.yellow);

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// 测试 4: 集成场景测试
// ============================================================================

async function testIntegrationScenario() {
  section('测试 4: 集成场景 - 带重试和性能监控的操作');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    log('模拟一个可能失败的操作，使用重试机制和性能监控', colors.blue);
    
    const retryManager = new SmartRetryManager();
    let attemptCount = 0;
    
    const result = await performanceMonitor.measure('integration.scenario', async () => {
      return await retryManager.executeWithRetry(
        async (context) => {
          attemptCount++;
          log(`  尝试 ${context.attempt}...`, colors.reset);
          
          // 模拟 60% 的失败率
          if (Math.random() > 0.6) {
            await new Promise(resolve => setTimeout(resolve, 50));
            return { success: true, data: 'Operation completed', attempts: attemptCount };
          }
          
          return { success: false, error: 'Random failure' };
        },
        (result) => result.success === true,
        { maxRetries: 5, baseDelay: 100 }
      );
    });
    
    log(`✓ 集成测试成功（共 ${attemptCount} 次尝试）`, colors.green);
    log(`  结果: ${JSON.stringify(result)}`, colors.reset);
    
    const stats = performanceMonitor.getStats('integration.scenario');
    if (stats) {
      log(`  总耗时: ${stats.average.toFixed(2)}ms`, colors.reset);
    }
    
    testsPassed++;
  } catch (error) {
    log(`✗ 集成测试失败: ${error}`, colors.red);
    testsFailed++;
  }

  log(`\n集成测试完成: ${testsPassed} 通过, ${testsFailed} 失败`, 
      testsFailed === 0 ? colors.green : colors.yellow);

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// 主测试函数
// ============================================================================

async function runAllTests() {
  console.clear();
  
  section('UI-TARS Desktop 优化功能集成测试');
  log('测试日期: ' + new Date().toLocaleString('zh-CN'), colors.reset);
  log('测试环境: 真实运行环境', colors.reset);
  
  const startTime = Date.now();
  
  // 运行所有测试
  const results = {
    retry: await testRetryMechanism(),
    performance: await testPerformanceMonitoring(),
    ocr: await testOCRFunctionality(),
    integration: await testIntegrationScenario(),
  };
  
  const totalTime = Date.now() - startTime;
  
  // 汇总结果
  section('测试总结');
  
  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;
  
  log(`总测试数: ${totalTests}`, colors.cyan);
  log(`通过: ${totalPassed}`, colors.green);
  log(`失败: ${totalFailed}`, totalFailed === 0 ? colors.green : colors.red);
  log(`通过率: ${((totalPassed / totalTests) * 100).toFixed(1)}%`, 
      totalFailed === 0 ? colors.green : colors.yellow);
  log(`总耗时: ${(totalTime / 1000).toFixed(2)}秒`, colors.cyan);
  
  // 详细结果
  console.log('\n详细结果:');
  console.log(`  智能重试机制: ${results.retry.passed}/${results.retry.passed + results.retry.failed} 通过`);
  console.log(`  性能监控系统: ${results.performance.passed}/${results.performance.passed + results.performance.failed} 通过`);
  console.log(`  OCR 文字识别: ${results.ocr.passed}/${results.ocr.passed + results.ocr.failed} 通过`);
  console.log(`  集成场景测试: ${results.integration.passed}/${results.integration.passed + results.integration.failed} 通过`);
  
  // 性能报告
  section('性能数据汇总');
  const allStats = performanceMonitor.getAllStats();
  console.log(`共收集 ${allStats.size} 个性能指标\n`);
  
  // 显示前 10 个最慢的操作
  const sortedStats = Array.from(allStats.entries())
    .sort((a, b) => b[1].average - a[1].average)
    .slice(0, 10);
  
  log('最慢的 10 个操作:', colors.cyan);
  sortedStats.forEach(([name, stats], index) => {
    console.log(`  ${index + 1}. ${name}: ${stats.average.toFixed(2)}ms (${stats.count}次)`);
  });
  
  // 保存完整报告
  performanceMonitor.generateReport();
  await performanceMonitor.save();
  log('\n✓ 完整性能报告已保存到日志目录', colors.green);
  
  // 最终状态
  console.log('\n' + '='.repeat(80));
  if (totalFailed === 0) {
    log('🎉 所有测试通过！优化功能运行正常。', colors.green);
  } else {
    log(`⚠️  ${totalFailed} 个测试失败，请检查上述错误信息。`, colors.yellow);
  }
  console.log('='.repeat(80) + '\n');
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    passRate: (totalPassed / totalTests) * 100,
    duration: totalTime,
  };
}

// 导出测试函数
export { runAllTests, testRetryMechanism, testPerformanceMonitoring, testOCRFunctionality };

// 如果直接运行此文件
if (require.main === module) {
  runAllTests()
    .then((results) => {
      process.exit(results.totalFailed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('测试运行失败:', error);
      process.exit(1);
    });
}
