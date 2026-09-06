# Field Mode 设计规格

> 目标：在保留 Normal / Field 双模式、昼夜主题与统一动画时钟的前提下，用覆盖整个 viewport 的二维参数化谱轨道族构成高性能 Field Mode。

## 1. 设计原则

Field Mode 的主体是连续的谱纹理，不是随机粒子，也不是一条母轨道的重复切片。

必须同时满足：

- 所有 tracer 共用同一组 fractional frequencies 与同一个全局时钟；
- tracer 的差异只来自二维空间参数 `a=(u,v)`；
- 相邻参数的幅度与相位平滑变化；
- 基础位置直接覆盖 viewport，谱族只提供位移；
- 不使用 Perlin、Simplex、curl noise、随机向量场或粒子 advection；
- DOM 组件只影响最终颜色和透明度，不改变数学状态；
- Light / Dark 只改变视觉参数，不重置或分叉轨道族；
- 花瓣、萤火虫与草读取同一个谱族采样器。

## 2. 页面层级

逻辑层级为：

```text
Background image / gradient
        ↓
FieldBack: dense spectral texture
        ↓
Application UI
        ↓
FieldFront: sparse foreground tracers
        ↓
Navbar / modal / critical UI
```

`FieldBack` 与 `FieldFront` 必须是两个真实的 DOM canvas，分别拥有 WebGL2 context。GPU draw pass 不能跨越 DOM stacking context，因此不能把两层合并到同一个 canvas。

浏览器层级与各 canvas 内的绘制顺序固定为：

1. `z-3` FieldBack canvas：background glow → background core；
2. Application UI；
3. `z-20` FieldFront canvas：foreground glow → foreground core；
4. `z-[21]` interaction canvas。

独立的 Canvas2D 画布只保留 Normal Mode 点击涟漪，不计算或绘制 tracer。

## 3. 模式定义

### Normal Mode

- 保留现有花瓣、萤火虫、草、弹幕和点击涟漪；
- 不创建 tracer WebGL context；
- 不绘制密集谱纹理；
- 维持当前低成本 Canvas2D 路径。

### Field Mode

- 创建后景与前景两个全屏 WebGL2 context；
- 使用 instancing 绘制二维参数化谱轨道族；
- 保留花瓣、萤火虫与草的物种运动，再插值接入同一谱族；
- DOM obstacle 定时采样，不能逐帧读取布局；
- 约 0.9 秒完成 Normal / Field 双向过渡。

## 4. 统一数学状态

频率固定为：

```math
lambda_j=eta m_j^{3/2},
qquad
m=(2,3,5,7,11,13),
qquad
eta=0.18.
```

视觉墙钟与数学时间分离：

```math
t_{\mathrm{math}}=
ho t_{\mathrm{wall}},
qquad

ho=0.30.
```

轨道族为：

```math
Gamma(a,t)
=
sum_{j=1}^{N}c_j(a)e^{ilambda_jt},
qquad
a=(u,v)in[0,1]^2.
```

`c_j(a)=A_j(a)e^{i\phi_j(a)}` 的幅度与相位都使用平滑正弦调制。低 mode 使用较小的空间调制，高 mode 使用较大的调制，从而同时提供大尺度方向一致性和局部 filament。

## 5. 参数空间与屏幕覆盖

每个 tracer 的 `(u,v)` 由确定性的二维 R2 低差异序列生成。GPU state 只保存：

```text
u
v
opacity
styleSeed
```

谱参数仍为 $a=(u,v)\in[0,1]^2$，但 anchor 使用约 10% overscan：

$$
q(a)=1.2a-0.1\in[-0.1,1.1]^2.
$$

基础位置与谱位移分别为：

```math
X_0(u,v)=
\begin{pmatrix}
W(1.2u-0.1)\\
H(1.2v-0.1)
\end{pmatrix},
qquad
D(u,v,t)=s
\begin{pmatrix}
\Re\Gamma(u,v,t)\\
\Im\Gamma(u,v,t)
\end{pmatrix}.
```

最终位置：

```math
X(u,v,t)=X_0(u,v)+D(u,v,t).
```

空间覆盖由参数空间直接保证，不再搜索固定 16:9 crop，也不存在 visible intervals 或基于区间的重调度。

## 6. Tracer

每条尾迹都由同一个参数 `a_k` 的真实历史位置构成：

```math
P_{k,\ell}
=
X\!\left(a_k,t-\frac{\ell}{L-1}\Delta\right).
```

全质量参数：

```text
background tracers: 3200
foreground tracers: 120
capacity: 4096
trail samples: 14
spectral span: 0.25–0.60
modes: 6
DPR: 1.5
FPS target: 60
```

单条 tracer 必须弱，局部 bundle 必须明显，整体视觉主体是 texture / field。

视觉范围：

| 参数       | Light                          | Dark                            |
| ---------- | ------------------------------ | ------------------------------- |
| core alpha | 0.08–0.16                      | 0.12–0.23                       |
| glow alpha | 0.012–0.034                    | 0.023–0.053                     |
| core width | 0.82–1.48 px                   | 0.74–1.40 px                    |
| palette    | blue / cyan-blue / blue-violet | cyan / cold blue / faint violet |

不绘制粒子 head，不使用长 comet tail，不根据瞬时速度伪造直线。

## 7. DOM 组件遮罩

DOM 元素通过 `[data-field-obstacle]` 提供 bounding rect。采样只影响 fragment shader 的颜色与透明度：

- 空白背景：保留蓝 / 青蓝 /蓝紫色谱纹；
- 组件内部：轨迹改成灰色；
- background pass 在组件内部乘 `0.15`；
- background pass 在组件外 `18 px` 内使用 smoothstep 形成负空间 halo；
- foreground pass 在组件内部乘 `0.62`；
- foreground pass 数量始终远低于 background pass。

组件不得修改 `lambda`、phase、coefficient、global time 或 spectrum，也不引入碰撞、反射、偏折或位置相关力。

## 8. Species 接入

### Sakura

- 保留下落、横向摆动、spin、twist 与 squash；
- 固定使用自己的 `a_k`；
- spectral coupling 为 `0.30–0.50`；
- 谱族只增加横向与小尺度二维位移。

### Fireflies

- 保留 local orbit、breathe 与 slow drift；
- 固定使用自己的 `a_k`；
- spectral coupling 为 `0.25–0.40`；
- 不与 tracer 完全同步。

### Grass

- 参数固定为 `a=(u,1)`；
- 从 `\partial_t\Gamma(a,t)` 的横向分量读取摆动方向；
- 保持根部位置与 blade 几何不变。

Species 不创建独立 spectrum，也不能反向影响 tracer。

## 9. 过渡

Normal → Field：

1. 读取持续运行的 global time；
2. 首次需要时创建 GPU buffer 与确定性参数；
3. dense field 随现有 `fieldBlend` 从 0 淡入；
4. species 在约 0.9 秒内插值到 spectral-family motion；
5. 不重置时间，不闪屏，不让 tracer 瞬移。

Field → Normal：

1. foreground 与 background 随 `fieldBlend` 淡出；
2. species 插值回 Normal motion；
3. WebGL 在当前页面生命周期内休眠，组件卸载时释放；
4. Normal Mode 不读取 tracer 私有状态。

## 10. 性能等级

| 等级 | Background | Foreground | Modes | Trail samples |  DPR | FPS |
| ---- | ---------: | ---------: | ----: | ------------: | ---: | --: |
| Q0   |       3200 |        120 |     6 |            14 |  1.5 |  60 |
| Q1   |       2800 |        100 |     6 |            12 |  1.5 |  60 |
| Q2   |       2200 |         80 |     6 |            12 | 1.25 |  60 |
| Q3   |       1800 |         64 |     6 |            10 |  1.0 |  60 |
| Q4   |       1400 |         48 |     5 |             8 |  1.0 |  45 |
| Q5   |        900 |         32 |     4 |             6 |  1.0 |  30 |

连续三个 2 秒窗口低于 42 FPS 后只降一级。降级顺序优先减少 tracer 数量与 DPR，最后才减少 mode 数。

Resize 只更新 canvas 尺寸与 uniform，不重建 4096 个长期参数状态。

## 11. 模块结构

```text
components/
  FieldScene.tsx
    unified RAF + mode/theme blend + quality + species + obstacle sampling

  field/
    SpectralTracerLayer.tsx
      z-3/z-20 WebGL2 canvases + two passes per canvas + obstacle mask

    spectralField.ts
      shared frequencies + R2 parameters + CPU/GLSL spectral-family sampling
```

## 12. 验收边界

代码验收：

- 不存在旧 crop、visible intervals、`orbitTime` 或区间重调度；
- CPU species 与 GPU tracer 共用相同的谱族常量；
- tracer renderer 只有后景与前景两个 WebGL2 context，分别位于 UI 下方和上方；
- Canvas2D 不再绘制前景 tracer；
- obstacle 只进入视觉 mask；
- Q0–Q5 与本文件一致。

运行时的覆盖率、局部纹理、组件可读性和实际 FPS 必须通过浏览器环境单独验收，不能由 lint、typecheck、test 或 build 代替。

## 13. 最终原则

```text
one spectrum
+ one global clock
+ one spatially parameterized orbit family
+ many correlated tracers
+ two synchronized WebGL layer renderers
```

页面不是覆盖了一层随机粒子动画，而是处在同一个有结构的数学场中。
