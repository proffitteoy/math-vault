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

随机性只允许用于初始化：

- phase；
- amplitude；
- center；
- scale；
- lifetime；
- species parameters。

初始化以后，轨迹必须 deterministic。

---

## 8. 统一 spectrum

高性能档使用同一组基础频率：

```text
λ1, λ2, ..., λN
```

推荐基础 mode indices：

```text
2, 3, 5, 7, 11, 13, 17, 19
```

使用 fractional spectral law：

```math
\lambda_m = \beta m^{3/2}.
```

Tracer 不再让二维速度场决定宏观方向。所有 tracer 共享唯一的跨屏母螺旋 `Γ(u,t)`，fractional spectrum 只负责对母轨道做小幅形变。seed 只决定出生相位、法向 lane、速度、亮度、尾迹时长和视觉尺寸。

花瓣、萤火虫与草可按各自惯性和物种运动逐步耦合这个场；它们不能反过来让 tracer 退化为独立的 Fourier orbit。

```text
fractional spectrum
    ↓
shared deformation q(u,t)
    ↓
one master spiral Γ(u,t)
    ↓
analytic tracer samples
```

---

## 9. Tracer 设计

Tracer 是 Field Mode 的主视觉，不是“粒子点”。

### 9.0 当前实现：唯一母螺旋

所有 tracer 共享一条覆盖整个 viewport 的解析曲线：

```math
z_0(u)=r(u)e^{i\theta(u)},\quad
r(u)=r_{\min}+(r_{\max}-r_{\min})(1-u)^{0.82},
\quad
\theta(u)=\theta_0+2\pi(2.15u+0.12u^2).
```

`r_max = 0.65 × viewport diagonal`，`r_min = 0.035 × min(width, height)`，中心位于 `(0.50W, 0.48H)`。fractional spectrum 只作为 3.8% 径向、6.0% 切向形变：

```math
q(u,t)=
\sum_{m\in\{2,3,5,7,11,13\}}
a_m e^{i(2\pi mu-\beta m^{3/2}t+\phi_m)},
\qquad a_m\propto m^{-1.3}.
```

每个 tracer 解析采样 `X_j(t)=Γ(u_j(t),t)+δ_jN(u_j,t)`，其中 `|δ_j|≤10 px`。后景 WebGL2 由 `gl_InstanceID` 和时间直接生成位置；前景 Canvas2D 使用同一公式。不保存位置 buffer，不运行 RK2 或 transform feedback。

默认 1920×1080 约 650 个 tracer，最高 900；前后景约 85%/15%。每条尾迹用 12 个样本覆盖 0.25–0.45 秒，core 为 1.8–3.2 px、head 为 3.5–5 px、glow 为 6–10 px。障碍物只衰减 alpha，不能改变 `Γ`。

### 9.0a 旧速度场方案（已废弃）

以下 9.0a–9.6 仅保留旧方案的推导记录，不再作为当前 tracer 的实现约束。

定义整个平面共享的复值谱场：

```math
\psi(x,t)
=
\sum_{m=1}^{M}
c_m e^{i(k_m\cdot x-\lambda_m t+\phi_m)}.
```

由它生成速度场：

```math
v_\psi(x,t)
=
\frac{
\operatorname{Im}(\bar\psi\nabla\psi)
+
\mu\operatorname{Re}(\bar\psi\nabla\psi)
}{
|\psi|^2+\varepsilon
}.
```

每个 tracer 只保存持久状态 (x, y, age, seed)，并满足同一个常微分方程：

```math
\dot X_i(t)=v_\psi(X_i(t),t).
```

使用 midpoint / RK2 推进：

```math
K_1=v_\psi(X_i^n,t_n),
```

```math
X_i^{n+1}
=
X_i^n
+
\Delta t\,
v_\psi
\left(
X_i^n+\frac{\Delta t}{2}K_1,
t_n+\frac{\Delta t}{2}
\right).
```

WebGL2 后景 tracer 使用 transform feedback 在两组状态 buffer 间交换。前景 tracer 使用同一公式的 Canvas2D 状态推进。禁止重新引入每粒子独立 phase、amplitude、center + orbit。

### 9.1 形态

推荐：

- 形状：短线段 / 微光丝。
- 长度：`4–14 px`。
- 极少量长 tracer：`14–22 px`。
- 线宽：`0.5–1.2 px`。
- 圆头。
- 不使用实心圆作为主体。
- 不使用明显 bloom。
- 不使用彩虹色。
- 颜色跟随主题，但低饱和、低 alpha。

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

建议按 viewport 面积动态取值。

Normal：

```text
0 tracer
```

Field：

```text
1920×1080:
1200–2400 background tracer
80–180 foreground tracer
```

高端设备可提升至：

```text
3000–5000 background tracer
150–300 foreground tracer
```

不要默认上万。

### 9.3 前后景比例

```text
FieldBack  = 90%–95%
FieldFront = 5%–10%
```

前景 tracer 必须：

- 更稀；
- 更短；
- 更淡；
- 生命周期更长；
- 不连续从正文中央经过。

### 9.4 生命周期

推荐：

```text
8–20 s
```

死亡后不要立即在原地重生。

重生规则：

1. alpha 先衰减。
2. 在另一区域重置持久位置状态。
3. 新 tracer 从 alpha 0 淡入。
4. 不改变 global spectral phases。

因此重生只是“观测窗口变化”，不是动力系统重置。

### 9.5 朝向

Tracer 朝向使用瞬时速度：

```math
v_j(t) \approx \frac{X_j(t)-X_j(t-\Delta t)}{\Delta t}.
```

线段方向与 `v_j` 对齐。

长度可随速度弱变化：

```math
L_j = L_0 + k \min(\lVert v_j\rVert,v_{\max}).
```

不要让长度和速度强绑定，否则局部会突然爆长。

### 9.6 alpha

建议背景：

```text
0.03–0.14
```

前景：

```text
0.04–0.10
```

避免持续高亮。

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

点击不再画一个额外圆，而是改变附近 tracer 的 spectral phase。

建议效果：

```text
click
  ↓
nearby tracers phase-shift
  ↓
局部轨迹短时间发生扭折
  ↓
仍继续沿同一 spectrum 演化
```

避免：

- 爆炸粒子；
- 强烈冲击波；
- 颜色闪烁。

Pointer move 只允许弱影响：

- 轻微局部 phase bias；
- 轻微 rotation；
- 影响半径有限。

---

## 15. DOM 组件如何参与

组件不真正改变算子本身。

否则每个页面组件变化都会改变基础动力系统，导致数学模型与实现耦合过重。

正确方式是分两层：

```text
analytic master spiral
    ↓
screen embedding
    ↓
obstacle alpha mask
    ↓
render
```

因此：

- 数学位置由母螺旋与 fractional spectral deformation 解析生成；
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

### 15.2 Obstacle alpha mask

组件不能偏折轨迹，只能改变透明度。

目标不是“粒子撞墙”，而是：

> 同一条轨迹连续穿过页面，但在玻璃卡片后方显著减弱。

建议：

- FieldBack 穿组件时 alpha 只保留 `0.08–0.15`；
- FieldFront 穿组件时 alpha 只保留 `0.55–0.70`；
- 任何层都不能修改 `Γ(u,t)`。

---

## 16. FieldFront 规则

FieldFront 的存在只为了产生“页面有深度”的感觉。

严格限制：

1. 不画 density。
2. 不画大规模 streamline。
3. 不画 grass。
4. 不画 firefly 群。
5. Light 下最多允许极少量花瓣。
6. 只允许同一母轨道上的弯曲 tracer 和极少量单体元素。
7. 鼠标 hover 到正文区域时进一步降低 alpha。

推荐：

```text
background tracer: normal alpha
foreground tracer over empty area: 0.08
foreground tracer over card: 0.03–0.05
foreground tracer over text: 0–0.03
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
  FieldScene/
    FieldScene.tsx
    FieldBack.tsx
    FieldFront.tsx
    fieldClock.ts
    fieldConfig.ts
    spectralCore.ts
    obstacleMap.ts
    pointerInput.ts
    species/
      sakura.ts
      fireflies.ts
      grass.ts
      tracers.ts
```

如果暂时不拆目录，也至少应在逻辑上保持这些模块边界。

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
500–900 tracer
6–8 shared spectral modes
40 sakura OR 50 fireflies
150 grass
single render loop
```

降级顺序：

```text
1. 减少 FieldFront
2. 减少 tracer 数量
3. 降 DPR
4. 减少 spectral modes
5. 60 → 45 → 30 FPS
```

不要先关闭花瓣、萤火虫或草，因为它们是主题身份的一部分。

---

## 20. 最终设计原则

Field Mode 的核心不是“更多动画”，而是：

```text
same clock
+ same spectrum
+ different observables
+ different species dynamics
+ one renderer
```

用户最终应该感受到：

> 草、花瓣、萤火虫和 tracer 明显不是同一种物体，但它们似乎生活在同一个数学世界中。
