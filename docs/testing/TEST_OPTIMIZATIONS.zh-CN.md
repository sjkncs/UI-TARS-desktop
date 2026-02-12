> **Fork Document**: This document was created as part of the community fork [sjkncs/UI-TARS-desktop](https://github.com/sjkncs/UI-TARS-desktop).
> Based on the original [bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) project. All original code and IP belong to ByteDance.

# 优化功能测试指南

**测试日期**: 2026-02-11  
**已实现功能**: Week 1-6

---

## 🧪 测试清单

### ✅ Week 1-2: 智能重试机制

#### 单元测试

```bash
cd apps/ui-tars
pnpm test retryManager.test.ts
```

**预期结果**:
```
✓ SmartRetryManager > executeWithRetry > should succeed on first attempt
✓ SmartRetryManager > executeWithRetry > should retry on failure and succeed
✓ SmartRetryManager > executeWithRetry > should throw error after max retries
✓ SmartRetryManager > executeWithRetry > should provide retry context
✓ SmartRetryManager > executeWithRetry > should handle exceptions
✓ SmartRetryManager > executeWithRetry > should apply exponential backoff
✓ SmartRetryManager > executeWithRetry > should respect max delay

Test Files  1 passed (1)
     Tests  7 passed (7)
```

#### 集成测试

**测试场景**: 点击操作失败后自动重试

1. 启动应用
2. 执行一个可能失败的点击操作
3. 观察日志输出

**预期日志**:
```
[Retry] Attempt 1/3
[Retry] Attempt 1 failed: ...
[Retry] Adjustments for next attempt: ['wait_longer']
[Retry] Attempt 2/3
[Retry] Waiting for UI to stabilize (attempt 2)
[Retry] Success on attempt 2
```

---

### ✅ Week 3-4: OCR 文字识别

#### 依赖检查

```bash
cd apps/ui-tars
pnpm list tesseract.js sharp
```

**预期输出**:
```
tesseract.js 5.x.x
sharp 0.33.x
```

#### 单元测试

```bash
pnpm test ocrService.test.ts
```

**注意**: OCR 测试需要依赖包安装完成

#### 功能测试

**测试 1: 初始化 OCR**

```typescript
import { ocrService } from '@main/services/ocrService';

// 初始化
await ocrService.initialize(['eng', 'chi_sim']);
console.log('OCR initialized:', ocrService.isInitialized());
```

**预期输出**: `OCR initialized: true`

**测试 2: 识别文字**

```typescript
// 准备测试图片（包含文字的截图）
const testImage = Buffer.from(/* base64 或文件 */);

// 识别文字
const results = await ocrService.recognize(testImage);
console.log('Found texts:', results.map(r => r.text));
```

**预期输出**: 识别出的文字列表

**测试 3: 查找并点击文本**

```typescript
import { NutJSElectronOperator } from '@main/agent/operator';

const operator = new NutJSElectronOperator();

// 查找并点击"登录"按钮
const success = await operator.findTextAndClick("登录");
console.log('Click success:', success);
```

**预期输出**: `Click success: true`（如果找到文本）

---

### ✅ Week 5-6: 性能监控系统

#### 单元测试

```bash
pnpm test performanceMonitor.test.ts
```

**预期结果**:
```
✓ PerformanceMonitor > start and end > should measure time correctly
✓ PerformanceMonitor > measure > should measure async function
✓ PerformanceMonitor > measureSync > should measure sync function
✓ PerformanceMonitor > getStats > should calculate statistics
✓ PerformanceMonitor > generateReport > should generate report
✓ PerformanceMonitor > getSlowOperations > should identify slow ops
✓ PerformanceMonitor > clear > should clear all metrics
✓ PerformanceMonitor > getSnapshot > should return snapshot

Test Files  1 passed (1)
     Tests  8+ passed (8+)
```

#### 功能测试

**测试 1: 基础计时**

```typescript
import { performanceMonitor } from '@main/services/performanceMonitor';

// 开始计时
performanceMonitor.start('test-operation');

// 执行一些操作
await someOperation();

// 结束计时
const duration = performanceMonitor.end('test-operation');
console.log('Duration:', duration, 'ms');
```

**测试 2: 自动测量**

```typescript
const result = await performanceMonitor.measure(
  'my-operation',
  async () => {
    await someAsyncOperation();
    return 'result';
  }
);

// 查看统计
const stats = performanceMonitor.getStats('my-operation');
console.log('Stats:', stats);
```

**预期输出**:
```
Stats: {
  count: 1,
  average: 123.45,
  min: 123.45,
  max: 123.45,
  p50: 123.45,
  p95: 123.45,
  p99: 123.45
}
```

**测试 3: 性能报告**

```typescript
// 执行多个操作
await performanceMonitor.measure('op1', async () => { /* ... */ });
await performanceMonitor.measure('op2', async () => { /* ... */ });
await performanceMonitor.measure('op3', async () => { /* ... */ });

// 生成报告
const report = performanceMonitor.generateReport();
console.log(report);
```

**预期输出**:
```
================================================================================
Performance Report
Generated at: 2026-02-11T12:00:00.000Z
================================================================================

op1:
  Count:   1
  Average: 123.45ms
  Min:     123.45ms
  Max:     123.45ms
  P50:     123.45ms
  P95:     123.45ms
  P99:     123.45ms

...
================================================================================
```

**测试 4: 慢操作检测**

```typescript
// 执行一个慢操作
await performanceMonitor.measure('slow-op', async () => {
  await new Promise(resolve => setTimeout(resolve, 1500));
});

// 获取慢操作列表
const slowOps = performanceMonitor.getSlowOperations(1000);
console.log('Slow operations:', slowOps);
```

**预期日志**:
```
[Performance] Slow operation: slow-op took 1500.00ms
```

---

## 🔧 集成测试

### 测试场景 1: 完整的 Agent 执行流程

**步骤**:
1. 启动应用
2. 执行一个任务（例如：打开浏览器并搜索）
3. 观察日志中的性能指标

**预期日志**:
```
[Performance] agent.screenshot took 234.56ms
[Performance] agent.inference took 1234.56ms
[Performance] agent.execute took 345.67ms
[OCR] Found 25 text regions
[Retry] Success on attempt 1
```

### 测试场景 2: 重试机制触发

**步骤**:
1. 执行一个可能失败的操作
2. 观察重试过程
3. 检查最终结果

**预期行为**:
- 第一次失败后自动重试
- 重试前等待界面稳定
- 根据失败原因调整策略
- 最多重试 2 次

### 测试场景 3: OCR 辅助定位

**步骤**:
1. 打开一个包含文字的页面
2. 使用 `findTextAndClick()` 查找文本
3. 验证是否正确点击

**预期行为**:
- OCR 识别出页面文字
- 找到匹配的文本区域
- 点击文本中心位置

---

## 📊 性能基准测试

### 基准指标

运行以下脚本收集基准数据：

```typescript
// benchmark.ts
import { performanceMonitor } from '@main/services/performanceMonitor';

async function runBenchmark() {
  // 截图性能
  for (let i = 0; i < 10; i++) {
    await performanceMonitor.measure('screenshot', async () => {
      await operator.screenshot();
    });
  }

  // OCR 性能
  for (let i = 0; i < 5; i++) {
    await performanceMonitor.measure('ocr', async () => {
      await ocrService.recognize(testImage);
    });
  }

  // 生成报告
  console.log(performanceMonitor.generateReport());
}

runBenchmark();
```

**预期基准**:

| 操作 | 平均时间 | P95 | P99 |
|------|---------|-----|-----|
| 截图 | ~200ms | ~300ms | ~400ms |
| OCR 识别 | ~1500ms | ~2000ms | ~2500ms |
| 点击操作 | ~100ms | ~150ms | ~200ms |
| 推理 | ~1000ms | ~1500ms | ~2000ms |

---

## 🐛 故障排除

### 问题 1: 重试测试失败

**症状**: 重试机制没有触发

**检查**:
```typescript
// 确认重试管理器已导入
import { retryManager } from '@main/services/retryManager';

// 检查操作类型是否在关键操作列表中
const criticalActions = ['click', 'type', 'drag', 'left_double', 'right_single'];
```

### 问题 2: OCR 无法识别

**症状**: `ocrService.recognize()` 返回空数组

**检查**:
1. 依赖是否安装：`pnpm list tesseract.js`
2. 是否已初始化：`ocrService.isInitialized()`
3. 图片质量是否足够
4. 置信度阈值是否过高

**解决**:
```typescript
// 降低置信度阈值
// 在 ocrService.ts 中修改
const filtered = ocrResults.filter(r => r.confidence > 0.5); // 从 0.6 降到 0.5
```

### 问题 3: 性能监控数据丢失

**症状**: `getStats()` 返回 null

**检查**:
```typescript
// 确认操作名称一致
performanceMonitor.start('my-op');
// ...
performanceMonitor.end('my-op'); // 名称必须完全一致
```

### 问题 4: 依赖安装失败

**症状**: `tesseract.js` 或 `sharp` 安装报错

**解决**:
```bash
# 使用 --ignore-scripts 跳过构建脚本
pnpm add tesseract.js sharp --ignore-scripts

# 或者清理缓存后重试
pnpm store prune
pnpm install
```

---

## ✅ 验收标准

### Week 1-2: 智能重试

- [x] 单元测试全部通过
- [x] 关键操作自动重试
- [x] 失败原因正确分析
- [x] 策略自动调整
- [x] 日志记录完整

### Week 3-4: OCR 识别

- [ ] 依赖包成功安装
- [ ] OCR 服务正常初始化
- [ ] 文字识别准确率 >85%
- [ ] `findTextAndClick()` 正常工作
- [ ] 多语言支持正常

### Week 5-6: 性能监控

- [x] 单元测试全部通过
- [x] 性能指标正确记录
- [x] 统计计算准确
- [x] 慢操作正确识别
- [x] 报告格式正确

---

## 📝 测试报告模板

```markdown
# 优化功能测试报告

**测试日期**: YYYY-MM-DD
**测试人员**: [姓名]
**测试环境**: Windows 11 / Node.js 20.x

## 测试结果

### Week 1-2: 智能重试
- 单元测试: ✅ 通过 / ❌ 失败
- 集成测试: ✅ 通过 / ❌ 失败
- 问题: [描述]

### Week 3-4: OCR 识别
- 依赖安装: ✅ 成功 / ❌ 失败
- 单元测试: ✅ 通过 / ❌ 失败
- 功能测试: ✅ 通过 / ❌ 失败
- 识别准确率: [百分比]
- 问题: [描述]

### Week 5-6: 性能监控
- 单元测试: ✅ 通过 / ❌ 失败
- 功能测试: ✅ 通过 / ❌ 失败
- 性能基准: [数据]
- 问题: [描述]

## 总体评价

[总结测试结果和建议]
```

---

**开始测试**: 按照上述步骤逐项测试各个优化功能
