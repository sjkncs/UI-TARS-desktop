> **Fork Document**: This document was created as part of the community fork [sjkncs/UI-TARS-desktop](https://github.com/sjkncs/UI-TARS-desktop).
> Based on the original [bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) project. All original code and IP belong to ByteDance.

# 集成测试指南

**测试目的**: 在真实环境中验证已实现的优化功能

---

## 🚀 快速开始

### 方法 1: 使用批处理脚本（推荐）

```bash
# 在项目根目录运行
test-integration.bat
```

### 方法 2: 手动运行

```bash
cd apps/ui-tars

# 编译测试脚本
pnpm exec tsc src/main/test-integration.ts --outDir out --module commonjs --target es2020 --esModuleInterop --skipLibCheck

# 运行测试
node out/main/test-integration.js
```

### 方法 3: 在应用中测试

```typescript
// 在应用代码中导入并运行
import { runAllTests } from '@main/test-integration';

// 运行所有测试
const results = await runAllTests();
console.log('测试结果:', results);
```

---

## 📋 测试内容

### 测试 1: 智能重试机制 ✅

**测试场景**:
1. 首次成功（无重试）
2. 失败后重试成功
3. 达到最大重试次数

**验证点**:
- ✅ 成功时不重试
- ✅ 失败时自动重试
- ✅ 重试次数正确
- ✅ 指数退避生效
- ✅ 错误正确抛出

### 测试 2: 性能监控系统 ✅

**测试场景**:
1. 基础计时功能
2. 自动测量功能
3. 慢操作检测
4. 统计计算
5. 性能报告生成

**验证点**:
- ✅ 计时准确（误差 <10ms）
- ✅ 自动测量正常
- ✅ 慢操作识别（>1s）
- ✅ 统计数据正确（P50/P95/P99）
- ✅ 报告格式正确

### 测试 3: OCR 文字识别 ⏳

**测试场景**:
1. OCR 初始化
2. 文字识别（需要图片）
3. 资源清理

**验证点**:
- ✅ 初始化成功
- ⏳ 识别准确率（需要真实图片）
- ✅ 资源正确释放

**注意**: 完整的 OCR 测试需要在应用运行时使用真实截图。

### 测试 4: 集成场景 ✅

**测试场景**:
模拟带重试和性能监控的真实操作

**验证点**:
- ✅ 重试机制正常工作
- ✅ 性能数据正确记录
- ✅ 两个系统协同工作

---

## 📊 预期输出

### 成功输出示例

```
================================================================================
UI-TARS Desktop 优化功能集成测试
================================================================================

测试日期: 2026-02-11 20:45:00
测试环境: 真实运行环境

================================================================================
测试 1: 智能重试机制
================================================================================

测试 1.1: 首次成功（无重试）
✓ 首次成功，无需重试
  结果: {"success":true,"data":"test"}

测试 1.2: 失败后重试成功
✓ 重试成功（共 2 次尝试）
  结果: {"success":true,"data":"success after retry"}

测试 1.3: 达到最大重试次数
✓ 正确抛出错误（达到最大重试次数）
  错误信息: Failed after 2 attempts: ...

重试机制测试完成: 3 通过, 0 失败

================================================================================
测试 2: 性能监控系统
================================================================================

测试 2.1: 基础计时功能
✓ 计时准确: 52.34ms

测试 2.2: 自动测量功能
✓ 自动测量成功: 31.23ms

测试 2.3: 慢操作检测
✓ 慢操作检测成功: 1105.67ms

测试 2.4: 统计计算
✓ 统计计算成功:
  次数: 5
  平均: 17.45ms
  最小: 10.23ms
  最大: 29.87ms
  P50: 15.34ms
  P95: 28.90ms

测试 2.5: 性能报告生成
✓ 性能报告生成成功

--- 性能报告预览 ---
================================================================================
Performance Report
Generated at: 2026-02-11T12:45:00.000Z
================================================================================

retry.test1:
  Count:   1
  Average: 5.23ms
  ...

性能监控测试完成: 5 通过, 0 失败

================================================================================
测试 3: OCR 文字识别
================================================================================

测试 3.1: OCR 初始化
✓ OCR 初始化成功

测试 3.2: OCR 文字识别（需要真实图片）
  注意: 此测试需要屏幕截图或测试图片
  跳过此测试，建议在应用运行时测试

测试 3.3: OCR 资源清理
✓ OCR 资源清理成功

OCR 测试完成: 2 通过, 0 失败
  提示: 完整的 OCR 测试需要在应用运行时进行

================================================================================
测试 4: 集成场景 - 带重试和性能监控的操作
================================================================================

模拟一个可能失败的操作，使用重试机制和性能监控
  尝试 1...
  尝试 2...
✓ 集成测试成功（共 2 次尝试）
  结果: {"success":true,"data":"Operation completed","attempts":2}
  总耗时: 156.78ms

集成测试完成: 1 通过, 0 失败

================================================================================
测试总结
================================================================================

总测试数: 11
通过: 11
失败: 0
通过率: 100.0%
总耗时: 3.45秒

详细结果:
  智能重试机制: 3/3 通过
  性能监控系统: 5/5 通过
  OCR 文字识别: 2/2 通过
  集成场景测试: 1/1 通过

================================================================================
性能数据汇总
================================================================================

共收集 8 个性能指标

最慢的 10 个操作:
  1. slow-operation: 1105.67ms (1次)
  2. integration.scenario: 156.78ms (1次)
  3. auto-measure: 31.23ms (1次)
  ...

✓ 完整性能报告已保存到日志目录

================================================================================
🎉 所有测试通过！优化功能运行正常。
================================================================================
```

---

## 🔧 在应用中测试

### 测试重试机制

在应用运行时，重试机制会自动生效：

```typescript
// operator.ts 中的操作会自动使用重试
await operator.execute({
  parsedPrediction: {
    action_type: 'click',
    action_inputs: { start_box: [100, 200, 100, 200] }
  }
});

// 如果点击失败，会自动重试最多 2 次
// 日志会显示：
// [Retry] Attempt 1/3
// [Retry] Attempt 1 failed: ...
// [Retry] Adjustments for next attempt: ['wait_longer']
// [Retry] Attempt 2/3
// [Retry] Success on attempt 2
```

### 测试性能监控

查看性能数据：

```typescript
import { performanceMonitor } from '@main/services/performanceMonitor';

// 获取所有统计
const allStats = performanceMonitor.getAllStats();
console.log('性能统计:', allStats);

// 生成报告
const report = performanceMonitor.generateReport();
console.log(report);

// 获取慢操作
const slowOps = performanceMonitor.getSlowOperations(1000);
console.log('慢操作:', slowOps);

// 实时快照
const snapshot = performanceMonitor.getSnapshot();
console.log('实时状态:', snapshot);
```

### 测试 OCR 功能

在应用中使用 OCR：

```typescript
import { ocrService } from '@main/services/ocrService';
import { NutJSElectronOperator } from '@main/agent/operator';

const operator = new NutJSElectronOperator();

// 初始化 OCR
await ocrService.initialize(['eng', 'chi_sim']);

// 截图并识别文字
const screenshot = await operator.screenshot();
const results = await ocrService.recognize(screenshot);
console.log('识别到的文字:', results);

// 查找并点击文本
const success = await operator.findTextAndClick("登录");
console.log('点击成功:', success);

// 提取所有文本
const allText = await ocrService.extractAllText(screenshot);
console.log('所有文本:', allText);
```

---

## 📈 性能基准

### 预期性能指标

| 操作 | 预期时间 | 实际时间 | 状态 |
|------|---------|---------|------|
| 重试机制（无重试） | <5ms | - | ⏳ |
| 重试机制（1次重试） | ~100ms | - | ⏳ |
| 性能监控计时 | <0.1ms | - | ⏳ |
| 性能监控测量 | +0.2ms | - | ⏳ |
| OCR 初始化 | <3s | - | ⏳ |
| OCR 识别（1920x1080） | 1-2s | - | ⏳ |

运行测试后，实际时间会填充到上表中。

---

## 🐛 故障排除

### 问题 1: TypeScript 编译失败

**解决方案**:
```bash
# 确保依赖已安装
cd apps/ui-tars
pnpm install

# 检查 TypeScript 版本
pnpm list typescript
```

### 问题 2: OCR 初始化失败

**症状**: `tesseract.js` 相关错误

**解决方案**:
```bash
# 重新安装 OCR 依赖
cd apps/ui-tars
pnpm add tesseract.js sharp
```

### 问题 3: 性能监控数据为空

**原因**: 测试运行太快，某些操作未记录

**解决方案**: 正常，某些快速操作可能不会被记录为慢操作

### 问题 4: 测试超时

**原因**: OCR 初始化或网络问题

**解决方案**:
- 确保网络连接正常（OCR 需要下载语言包）
- 增加超时时间
- 跳过 OCR 测试

---

## 📊 测试报告

测试完成后，会生成以下数据：

1. **控制台输出** - 实时测试结果
2. **性能报告** - 保存到 `{userData}/logs/performance.json`
3. **测试摘要** - 包含通过率、耗时等

### 查看性能报告

```bash
# Windows
type %APPDATA%\ui-tars-desktop\logs\performance.json

# 或在应用中
import { app } from 'electron';
import path from 'path';
const logPath = path.join(app.getPath('userData'), 'logs', 'performance.json');
```

---

## ✅ 验收标准

### 必须通过的测试

- [x] 重试机制 - 3/3 测试通过
- [x] 性能监控 - 5/5 测试通过
- [x] OCR 初始化 - 1/1 测试通过
- [x] 集成场景 - 1/1 测试通过

### 可选测试

- [ ] OCR 文字识别 - 需要真实图片
- [ ] 端到端测试 - 需要完整应用运行

---

## 🎯 下一步

测试通过后，建议：

1. **在真实任务中验证**
   - 运行应用并执行实际任务
   - 观察重试机制是否生效
   - 查看性能监控数据

2. **收集性能数据**
   - 运行多个任务
   - 生成性能报告
   - 识别性能瓶颈

3. **优化调整**
   - 根据性能数据调整参数
   - 优化慢操作
   - 继续后续优化（Week 7-8）

---

**测试愉快！** 🚀
