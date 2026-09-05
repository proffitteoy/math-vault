# Field Mode 设计规格

> 项目：`proffitteoy/nothing-new`  
> 目标：在不破坏现有页面可读性与交互的前提下，引入一个高性能数学动画模式。低性能档保持当前 Canvas2D 方案；高性能档使用统一的 fractional spectral flow 驱动 tracer、樱花、萤火虫和草，并让页面组件成为可感知但不抢占视觉主体的“空间结构”。

---

## 1. 设计目标

Field Mode 不是“再叠一层炫酷背景”，而是让页面里的运动对象共享同一个数学时间和同一组谱频率。

核心要求：

1. 正文永远优先，动画不得降低文字、按钮、播放器的可读性。
2. 高性能档的主要运动来自同一套谱动力系统，而不是每个组件各自随机运动。
3. 花瓣、萤火虫、草保留自己的视觉身份，只共享底层 spectrum，不强迫它们走同一条轨迹。
4. tracer 是高性能档的主要空间表达；花瓣、萤火虫只是“物种化”的谱运动。
5. 切换高低性能时不能出现整体重置、瞬移、突然清空或重新随机。
6. 所有全局动画共享一个时钟、一个 seed、一个主渲染循环。
7. 页面组件不被大面积动画覆盖；前景动画只允许极少量 tracer 穿过。

---

## 2. 当前架构基线

当前全局层级可抽象为：

```text
BackgroundSlider
    ↓
Gradient / tint
    ↓
BackgroundEffects
    ↓
Application UI
    ↓
Navbar / Floating UI
    ↓
ClickEffect
```

建议不推翻这一结构，而是把 `BackgroundEffects` 演化成统一的 `FieldScene`。

建议最终层级：

```text
z-0     Background image / BackgroundSlider
z-1     Gradient / tint
z-2     FieldBack
z-10    Application UI
z-20    FieldFront
z-50+   Navbar / modal / critical interaction UI
```

其中：

- `FieldBack`：绝大多数运动内容。
- `FieldFront`：只画极少量前景 tracer。
- `Application UI`：保持现有 z-10。
- `Navbar`、移动导航、弹层等永远高于 Field Mode。

---

## 3. 模式定义

建议只暴露一个用户开关：

```ts
performanceMode: "normal" | "field"
```

主题仍然独立：

```ts
theme: "light" | "dark"
```

因此实际状态是两个维度：

```text
Normal + Light
Normal + Dark
Field  + Light
Field  + Dark
```

不要把“白天/夜间”和“高低性能”耦合成一个状态机。

---

## 4. 低性能档：Normal Mode

### 4.1 渲染策略

- 继续使用当前 `BackgroundEffects` 的 Canvas2D 架构。
- 30 FPS。
- DPR 上限继续保持约 `1.25`。
- 桌面端启用；移动端维持现有降级策略。
- 不启用 `FieldFront`。
- 不做 DOM obstacle warp。
- 不做大规模 tracer。

### 4.2 各组件状态

| 组件                     | Light | Dark | Normal Mode 行为                       |
| ------------------------ | ----- | ---- | -------------------------------------- |
| BackgroundSlider         | 保留  | 保留 | 不变                                   |
| Gradient / tint          | 保留  | 保留 | 不变                                   |
| Sakura                   | 开    | 关   | 保留当前下降 + quasi-periodic 横摆     |
| Fireflies                | 关    | 开   | 保留当前 quasi-periodic 运动 + breathe |
| Grass                    | 开    | 开   | 保留当前 travelling-wave 摆动          |
| Danmaku                  | 开    | 开   | 保留当前低透明度横向移动               |
| Tracer                   | 关    | 关   | 不显示                                 |
| FieldFront               | 关    | 关   | 不创建                                 |
| ClickEffect              | 开    | 开   | 保留当前 ripple                        |
| DOM obstacle interaction | 关    | 关   | 不启用                                 |

Normal Mode 的原则是：**稳定、廉价、不改变现有视觉语言。**

---

## 5. 高性能档：Field Mode

### 5.1 渲染策略

- WebGL / WebGL2 单一全屏 context。
- 目标 60 FPS。
- 所有谱对象共享统一 clock。
- 统一维护 global spectral phases。
- tracer 使用 GPU buffer / instancing。
- DOM 只定期提供几何信息，不参与逐帧动画。
- `FieldBack` 与 `FieldFront` 由同一个 scene 管理，不建立多个独立 RAF。

### 5.2 高性能档组件状态

| 组件                     | Light | Dark | Field Mode 行为                          |
| ------------------------ | ----- | ---- | ---------------------------------------- |
| BackgroundSlider         | 保留  | 保留 | 只作为静态/缓慢背景                      |
| Gradient / tint          | 保留  | 保留 | 降低高频视觉对比                         |
| Sakura                   | 开    | 关   | 改为 spectral forcing + downward drift   |
| Fireflies                | 关    | 开   | 改为 weakly-coupled spectral orbit       |
| Grass                    | 开    | 开   | 由共享 spectrum 的局部相位驱动           |
| Danmaku                  | 弱化  | 弱化 | opacity 降低 30%–50%，避免与 tracer 竞争 |
| Tracer                   | 开    | 开   | Field Mode 主体                          |
| FieldFront               | 开    | 开   | 只画约 15% tracer                        |
| ClickEffect              | 替换  | 替换 | 改为 spectral phase impulse              |
| DOM obstacle interaction | 开    | 开   | 只衰减 alpha，不改变母轨道               |

---

## 6. 切换规则

### 6.1 Normal → Field

切换时禁止：

- 清空全部粒子；
- 重新随机 seed；
- 重新从 `t = 0` 开始；
- 瞬间切换 30 → 60 FPS；
- 让花瓣/萤火虫跳到新位置。

建议过程：

```text
0 ms
读取当前 globalTime 与 theme

0–300 ms
创建 WebGL FieldScene
初始化 spectral phases
使用当前时间直接求当前谱位置

300–700 ms
FieldBack alpha: 0 → 1
Normal BackgroundEffects alpha: 1 → 0.35

700–1000 ms
FieldFront alpha: 0 → target
Normal BackgroundEffects 停止独立轨迹更新

1000 ms+
Field Mode 完全接管
```

关键原则：

> 两档模式共享 `globalTime` 和 `seed`，切换只改变“表示方式”和“模式数”，不改变数学时间。

### 6.2 Field → Normal

反向执行：

1. 冻结当前 spectral clock 值。
2. Normal Mode 根据同一时间初始化当前帧。
3. `FieldFront` 先淡出。
4. `FieldBack` 再淡出。
5. Canvas2D 恢复完整 alpha。
6. WebGL context 释放或休眠。

---

## 7. 统一数学时钟

建议建立：

```ts
type FieldClock = {
  t: number
  dt: number
  seed: number
  mode: "normal" | "field"
}
```

所有对象必须从这里取时间。

禁止：

```ts
performance.now()
Date.now()
Math.random()
```

在各个子组件里各自决定自己的长期运动。

物种元素的随机性只允许用于初始化：

- phase；
- amplitude；
- center；
- scale；
- lifetime；
- species parameters。

初始化以后，轨迹必须 deterministic。Tracer 是例外中的更严格情形：它不能拥有独立 phase、amplitude 或 center，只允许从 seed 得到很小的确定性 time jitter 和视觉参数。

---

## 8. 统一 spectrum

高性能档使用同一组基础频率：

```text
λ1, λ2, ..., λN
```

推荐基础 mode indices：

```text
2, 3, 5, 7, 11, 13
```

使用 fractional spectral law：

```math
\lambda_m = \beta m^{3/2}.
```

Tracer 直接使用同一个二维线性观测轨道：

```math
\gamma(t)=\sum_jc_je^{i\beta m_j^{3/2}t}.
```

第 `k` 个 tracer 只取 `γ(t_k)`。seed 只能决定它从哪个可见时间区间开始、亮度、尾迹时长和视觉尺寸；不能生成粒子私有 phase、amplitude、center、lane 或速度尺度。

花瓣、萤火虫与草可按各自惯性和物种运动逐步耦合这个场；它们不能反过来让 tracer 退化为独立的 Fourier orbit。

```text
fractional spectrum
    ↓
one orbit γ(t)
    ↓
fixed spatial crop Q
    ↓
visible time intervals {I_r}
    ↓
slow time translations t_k(s)
    ↓
uniform viewport scale
```

---

## 9. Tracer 设计

Tracer 是 Field Mode 的主视觉，不是“粒子点”。

### 9.0 当前实现：唯一 fractional spectral orbit

所有 tracer 共享一条解析曲线：

```math
z(t)=\sum_jc_je^{i\beta m_j^{3/2}t}.
```

当前 mode 与 amplitude 为：

```text
modes       = [2, 3, 5, 7, 11, 13]
amplitudes  = [0.42, 0.36, 0.30, 0.25, 0.20, 0.16]
beta        = 0.18
search time = 0–600
samples     = 100,000
```

离线搜索固定一个 16:9 空间窗口：

```text
Q.x = [-0.595426,  0.134689]
Q.y = [-1.229504, -0.818815]
```

该窗口在 `12 × 7` 网格上的覆盖率为 100%，包含 73 个独立可见时间区间，总可见理论时长约 `14.1243`。窗口固定，不在运行时随机改变。

屏幕位置使用统一 scale，不做非等比拉伸：

```math
S=1.04\min\left(\frac{W}{x_1-x_0},\frac{H}{y_1-y_0}\right),
```

```math
X=\frac W2+S(x-x_c),
\qquad
Y=\frac H2-S(y-y_c).
```

`1.04` 提供 4% overscan，使弧线自然从屏幕外穿入穿出。后景 WebGL2 与前景 Canvas2D 必须使用同一组 crop 常量和同一个变换。

### 9.1 形态

每个 tracer 是同一条 `γ` 上的一段真实短弧。使用 12 个历史采样点覆盖理论时间 `0.10–0.18`，逐段连接并使用圆头；不能根据瞬时速度替换成直 quad，也不能额外绘制完整长期曲线。

明确可见的视觉参数：

| 参数          | 日间         | 夜间           |
| ------------- | ------------ | -------------- |
| core width    | `1.5–2.2 px` | `1.4–2.0 px`   |
| bright tracer | `2.4–3.0 px` | `2.2–2.8 px`   |
| glow width    | `3.5–5.5 px` | `4–6 px`       |
| core alpha    | `0.38–0.58`  | `0.48–0.68`    |
| glow alpha    | `0.04–0.08`  | `0.07–0.12`    |
| palette       | 三档固定蓝色 | 三档固定冷蓝紫 |

Core 使用正常 alpha blend；glow 单独一 pass 使用轻度 additive。

颜色分布固定为约 80% 普通蓝、15% 稍亮、5% 高亮，不为每根 tracer 生成紫蓝渐变。

建议 visual identity：

```text
────
  ─────╮
       ╰──
```

而不是：

```text
● ● ● ● ●
```

### 9.2 数量

Normal：

```text
0 tracer
```

Field：

```text
full quality:
visible target = 600 tracer
capacity       = 1200 tracer
```

自适应降级只减少同时显示的时间截面数量：

```text
quality ratio:
1.00 → 0.68 → 0.55
```

全质量目标允许在 `500–800` 内调节，当前固定为 600；容量只用于调度缓冲，不代表同时绘制 1200 个 tracer。

### 9.3 前后景比例

```text
FieldBack  = 510 / 600
FieldFront = 90 / 600
```

前景 tracer 必须：

- 更稀；
- 与后景使用同一组连续 `τ_k`；
- 与后景使用完全相同的 `γ` 和 viewport affine map；
- 只通过图层和 alpha mask 区分。

### 9.4 可见区间调度

可见集合预计算为：

```math
\mathcal I=\{t:z(t)\in Q\}=I_1\cup\cdots\cup I_{73}.
```

初始化先为 73 个区间各保留一个 tracer，其余 tracer 再按区间长度选择 `I_r`，并在区间内均匀选择 `τ_k`。因此第一帧明确覆盖全部长期可见弧段，同时整体密度仍近似与弧段理论时长成正比。真实时间 `s` 与理论时间的关系固定为：

```math
t_k(s)=\tau_k+0.025s.
```

当 tracer 离开当前区间后，先用 `0.2–0.4 s` 淡出，再从另一个按长度加权的可见区间重新采样，并用 `0.4–0.8 s` 淡入。不 clamp、不反弹、不修改轨道。

### 9.5 尾迹方向

方向来自相邻历史采样点：

```math
P_{k,\ell}=z(t_k-\ell\delta t).
```

渲染器连接 12 个历史点，理论时间跨度为 `0.10–0.18`。每一段自然沿着 `γ` 的真实局部切向；不再单独计算 velocity，也不按现实帧间时间拉伸尾迹。

### 9.6 alpha

Core alpha 日间为 `0.38–0.58`、夜间为 `0.48–0.68`。Glow alpha 日间为 `0.04–0.08`、夜间为 `0.07–0.12`。DOM 遮罩、区间出入淡化和模式切换 alpha 在这些基础值之上继续相乘。

---

## 10. Sakura

### Normal Mode

保持现有：

- downward fall；
- quasi-periodic lateral motion；
- spin；
- twist；
- squash。

### Field Mode

保留：

- downward drift；
- spin；
- twist；
- squash。

替换：

- 大尺度横向 `linear wind + sin + golden-ratio sin`

为：

- shared spectral forcing。

概念式：

```math
X_{\mathrm{sakura}}(t)
=
X_0
+
V_{\mathrm{fall}}t
+
\varepsilon\,\Gamma_{\mathrm{spec}}(t)
+
\delta_{\mathrm{flutter}}(t).
```

花瓣只部分跟随 spectrum。

建议：

```text
spectral coupling: 0.35–0.60
gravity/drift: strong
flutter: medium
```

视觉目标：

> 花瓣会被谱运动“卷偏”，但仍然明确地向下落。

---

## 11. Fireflies

### Normal Mode

保持当前 quasi-periodic x/y 运动和 breathe。

### Field Mode

萤火虫使用更少 mode、更小尺度的 spectral orbit。

建议：

```text
mode count: 3–5
spectral coupling: 0.20–0.45
local self-motion: strong
```

亮度呼吸不属于轨迹，单独处理：

```math
I(t)=I_0+I_1\sin(\omega_g t+\rho).
```

不要让 glow 频率和位移频率完全相同，否则会显得机械同步。

---

## 12. Grass

Grass 不作为独立粒子。

每根草只读取共享 spectrum 的空间相位：

```math
\theta_j(t)
=
\theta_{0,j}
+
\Re\sum_n d_{j,n}e^{i(k_nx_j-\lambda_nt+\phi_{j,n})}.
```

推荐：

- 底部整体有明显低频 travelling wave；
- 高频 mode 只占小比例；
- 相邻草的相位连续；
- 不能每根草随机独立摆动。

这样草成为整个 Field Mode 最稳定的“频谱指示器”。

---

## 13. Danmaku

Field Mode 中 Danmaku 不应该参与谱轨迹。

原因：

- 文本自身已经是高语义对象；
- 再做曲线运动会严重干扰阅读；
- tracer 已经承担空间运动表达。

因此：

- 保持横向直线；
- alpha 降低；
- 数量可减半；
- 与 FieldFront 不重叠时优先显示。

---

## 14. Click / Pointer 交互

### Normal Mode

保留当前 `ClickEffect` ripple。

### Field Mode

停用独立 ripple RAF。

点击和 Pointer move 都不修改 tracer。`γ`、`τ_k`、mode phase 与 viewport affine map 保持不变，避免交互把同一条轨道改造成位置相关动力系统。

---

## 15. DOM 组件如何参与

组件不真正改变算子本身。

否则每个页面组件变化都会改变基础动力系统，导致数学模型与实现耦合过重。

正确方式是分两层：

```text
one analytic spectral orbit
    ↓
fixed spatial crop Q
    ↓
visible interval scheduling
    ↓
uniform viewport scale
    ↓
obstacle alpha mask
    ↓
render
```

因此：

- 数学位置由 `z(t_k)∈Q` 与统一 viewport scale 解析生成；
- 卡片、播放器、Navbar 只改变可见性。

### 15.1 DOM 几何采样

只采样主要块：

- ProfileCard；
- CloudPlayer；
- LyricBar；
- StoryBoard；
- Dashboard；
- Navbar。

每 `250–500 ms` 或 resize/scroll 后重新读取 bounding rect。

不要逐帧调用 `getBoundingClientRect()`。

### 15.2 Obstacle color / alpha mask

组件不能偏折轨迹，只改变颜色和透明度。背景空白处保留蓝色；组件矩形内的 core 和 glow 统一使用中性灰（日间 `#808080`、夜间 `#B0B0B0`）。按尾迹实际覆盖区域切换，不按头部位置给整根尾迹变色；重叠组件只应用一次遮罩。

目标不是“粒子撞墙”，而是：

> 同一条轨迹连续穿过页面，但在玻璃卡片后方显著减弱。

建议：

- FieldBack 穿组件时乘 `0.15–0.25`，当前取 `0.20`；
- FieldFront 穿组件时乘 `0.65–0.80`，当前取 `0.72`；
- 任何层都不能修改 `γ`、`Q`、可见区间或 `t_k`。

---

## 16. FieldFront 规则

FieldFront 的存在只为了产生“页面有深度”的感觉。

严格限制：

1. 不画 density。
2. 不画大规模 streamline。
3. 不画 grass。
4. 不画 firefly 群。
5. Light 下最多允许极少量花瓣。
6. 只允许同一条 `γ` 的时间平移短弧和极少量单体元素。
7. 鼠标 hover 到正文区域时进一步降低 alpha。

推荐：

```text
background tracer: normal alpha
background tracer over card: alpha × 0.20
foreground tracer over empty area: normal alpha
foreground tracer over card: alpha × 0.72
```

---

## 17. Theme 切换

Theme 切换不能重置 spectral clock。

Light → Dark：

```text
sakura alpha ↓
firefly alpha ↑
grass palette transition
tracer palette transition
spectrum unchanged
phase unchanged
```

Dark → Light 反向。

因此用户会感觉：

> 世界没有重启，只是“物种”和光照发生了变化。

---

## 18. 推荐模块结构

```text
components/
  FieldScene.tsx                shared clock + species + interactions
  field/
    SpectralTracerLayer.tsx     scheduling + WebGL/Canvas trail rendering
    spectralOrbit.ts            orbit + crop + viewport map + visible intervals
```

---

## 19. 性能预算

### Normal

```text
Canvas2D
30 FPS
DPR <= 1.25
0 tracer
40 sakura / 50 fireflies / 150 grass / 15 danmaku
```

### Field

```text
WebGL2
60 FPS target
DPR 1.0–1.5 dynamic
600 tracer at full quality (510 back / 90 front)
1200 scheduling capacity
6 shared spectral modes
playback speed = 0.025
12 trail samples over theoretical time 0.10–0.18
40 sakura OR 50 fireflies
150 grass
single render loop
```

降级顺序：

```text
1. 减少 FieldFront
2. 减少 tracer 数量
3. 降 DPR
4. 减少 species spectral modes；tracer 始终保留 6 个 mode
5. 60 → 45 → 30 FPS
```

不要先关闭花瓣、萤火虫或草，因为它们是主题身份的一部分。

---

## 20. 最终设计原则

Field Mode 的核心不是“更多动画”，而是：

```text
same clock
+ same spectrum
+ one tracer orbit with many time translations
+ different species dynamics
+ one renderer
```

用户最终应该感受到：

> 草、花瓣、萤火虫和 tracer 明显不是同一种物体，但它们似乎生活在同一个数学世界中。
