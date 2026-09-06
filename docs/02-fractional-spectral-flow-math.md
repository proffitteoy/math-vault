# Fractional Spectral Field 数学模型

本文只定义 Field Mode 的数学状态、二维参数化观测与物种耦合。视觉层不能引入另一套动力系统。

## 1. Hilbert 空间与 fractional operator

取：

```math
mathcal H=L^2(mathbb T),
qquad
mathbb T=mathbb R/2pimathbb Z.
```

在 Fourier basis `e_m(x)=e^{imx}` 上：

```math
-\Delta e_m=m^2e_m.
```

定义：

```math
A=(-\Delta)^{3/4},
```

因此：

```math
Ae_m=|m|^{3/2}e_m.
```

加入视觉时间尺度 `\beta=0.18` 后，选定 mode 的频率为：

```math
lambda_j=\beta m_j^{3/2},
qquad
m=(2,3,5,7,11,13).
```

## 2. 一参数酉群

演化由：

```math
U(t)=e^{itA}
```

给出。对：

```math
\psi_0=\sum_j a_je_{m_j},
```

有：

```math
U(t)\psi_0
=
\sum_j a_je^{i|m_j|^{3/2}t}e_{m_j}.
```

这是保范数、可逆、无耗散的准周期演化。Field Mode 不把它解释为 Navier–Stokes 流体。

## 3. 二维参数化线性观测

旧实现只使用一个固定二维观测，得到一条轨道 `\gamma(t)`。当前实现改用由空间参数标记的一族有界线性观测：

```math
a=(u,v)\in[0,1]^2,
```

```math
\Gamma(a,t)
=
\sum_{j=1}^{N}
c_j(a)e^{i\lambda_jt}.
```

对每个固定的 `a`，`\Gamma(a,t)` 仍是同一个 fractional spectral evolution 的二维线性观测。不同 tracer 不拥有私有频率或私有时钟。

写成：

```math
c_j(a)=A_j(a)e^{i\phi_j(a)}.
```

实现使用：

```math
A_j(u,v)
=
\bar A_j
\left[
1+\varepsilon_{A,j}
\sin\!\left(
2\pi(k_{x,j}u+k_{y,j}v)+\eta_j
\right)
\right],
```

```math
\phi_j(u,v)
=
\bar\phi_j
+\varepsilon_{\phi,j}
\sin\!\left(
2\pi(p_{x,j}u+p_{y,j}v)+\xi_j
\right).
```

基础 amplitude envelope 为：

```text
[0.31, 0.24, 0.18, 0.13, 0.09, 0.06]
```

基础 phase 为：

```text
[0.31, 2.17, 4.02, 5.41, 1.24, 3.52]
```

幅度调制随 mode 从 `0.08` 增到 `0.27`，相位调制从 `0.16` 增到 `0.78`。低 mode 控制大尺度相干，高 mode 提供细丝、折返与局部干涉。

## 4. 参数连续性

`A_j` 与 `\phi_j` 都是参数空间上的光滑函数。因此对相邻参数 `a'=a+\delta a`：

```math
\Gamma(a',t)-\Gamma(a,t)=O(|\delta a|).
```

速度为解析导数：

```math
V(a,t)
=
\partial_t\Gamma(a,t)
=
i\sum_j\lambda_jc_j(a)e^{i\lambda_jt}.
```

所以相邻 tracer 的位置、速度、局部切向与曲率连续变化。filament、arc、fold 和 vortex-like loop 来自谱干涉，不来自噪声向量场。

## 5. 有界性

对每个固定 `a`：

```math
|\Gamma(a,t)|
\le
\sum_j|c_j(a)|.
```

由于参数域紧且 `c_j(a)` 连续，整个轨道族在 `[0,1]^2\times\mathbb R` 上一致有界。不需要位置 clamp、反弹或吸引子。

## 6. 确定性空间参数

Tracer 参数通过二维 R2 低差异序列生成。实现使用 generalized golden ratio：

```math
g^3=g+1,
qquad
g\approx1.324717957,
```

```math
u_k=\operatorname{frac}\left(\frac12+\frac{k+1}{g}\right),
qquad
v_k=\operatorname{frac}\left(\frac12+\frac{k+1}{g^2}\right).
```

这给出 deterministic、无运行时随机、无规则直角网格的二维覆盖。参数在 tracer 生命周期内保持固定。

## 7. Viewport 映射

谱系数参数仍取 $a=(u,v)\in[0,1]^2$。为补偿谱位移把边缘轨迹推出 viewport，anchor 使用：

$$
q(a)=1.2a-0.1\in[-0.1,1.1]^2.
$$

基础位置覆盖带 overscan 的屏幕区域：

```math
X_0(a)
=
\begin{pmatrix}
W(1.2u-0.1)\\
H(1.2v-0.1)
\end{pmatrix}.
```

谱位移为：

```math
D(a,t)
=
s
\begin{pmatrix}
\Re\Gamma(a,t)\\
\Im\Gamma(a,t)
\end{pmatrix}.
```

最终位置：

```math
X(a,t)=X_0(a)+D(a,t).
```

`s` 随较短 viewport 边在 `64–118 px` 内变化。Resize 只改变 `W,H,s`，不重建 `a_k`。

因此当前模型没有：

- `ORBIT_CROP`；
- 固定 16:9 搜索窗口；
- `VISIBLE_INTERVALS`；
- `sampleVisibleTime`；
- `orbitTime` 或 `intervalIndex`；
- visible interval reschedule。

## 8. 数学时间

墙钟与数学时间分离：

```math
t_{\mathrm{math}}
=
\rho t_{\mathrm{wall}},
qquad
\rho=0.30.
```

所有 tracer 与 species 在同一帧读取同一个 `t_{\mathrm{math}}`。Theme 切换、quality 降级、resize 和 DOM obstacle 都不能重置时间。

## 9. Tracer tail

第 `k` 个 tracer 固定使用 `a_k`。其第 `\ell` 个历史采样点为：

```math
P_{k,\ell}(t)
=
X\!\left(
a_k,
t-\frac{\ell}{L-1}\Delta_k
\right),
qquad
0\le\ell<L.
```

其中：

```text
L = 14 at full quality
Δ_k = 0.25–0.60 spectral-time span
```

$\rho=0.30$ 只控制当前数学时刻随墙钟推进的速度，不再第二次缩短 $\Delta_k$。一帧展示的是同一个参数化轨道上足够长的局部谱弧段，不是最近 0.08–0.22 秒形成的几像素残影。

谱弧段不是依据瞬时 velocity 绘制的直线，也没有粒子 head。

全质量状态：

```text
3200 background tracers
120 foreground tracers
4096 total capacity
6 spectral modes
```

每个 GPU instance 只保存：

```math
(u_k,v_k,\alpha_k,\sigma_k),
```

其中 `\sigma_k` 只决定线宽、透明度、颜色类别与 tail 时长，不能改变频率或谱系数函数。

## 10. WebGL 解析式 instancing

顶点着色器直接计算：

```math
X\!\left(a_k,t-\ell\delta t_k\right).
```

CPU 不逐帧推进粒子位置，也不维护独立 velocity、center、phase array 或 amplitude array。4096 个参数状态只在 renderer 创建时上传一次。

为了让 DOM UI 真正位于前后景之间，渲染使用两个 WebGL2 context：

```text
z-3 FieldBack canvas
    background glow
    background core

Application UI

z-20 FieldFront canvas
    foreground glow
    foreground core
```

每个 canvas 内 glow 使用轻度 additive blend，core 使用标准 alpha blend。两层共享同一组 `a_k` 生成规则、`\lambda_j`、谱族公式、数学时间与 obstacle 几何；context 只负责不同的 DOM 深度，不能产生独立动力。

## 11. DOM obstacle

DOM 几何只进入 fragment shader：

```text
math position
    ↓
color / alpha mask
```

组件内部轨迹使用灰色，空白背景使用蓝 / 青蓝 / 蓝紫：

```text
background inside alpha = 0.15
background edge halo = 18 px smoothstep
foreground inside alpha = 0.62
```

不允许 obstacle 修改：

```math
\lambda_j,quad
c_j(a),quad
t,quad
X(a,t).
```

因此没有 collision、reflection、velocity deflection、signed-distance force 或 potential-field avoidance。

## 12. Sakura

花瓣保留原有下落、横向摆动、spin、twist 与 squash。对固定参数 `a_k`：

```math
X_{\mathrm{sakura}}(t)
=
X_{\mathrm{normal}}(t)
+\kappa_kD(a_k,t),
```

```math
\kappa_k\in[0.30,0.50].
```

Field blend 只控制谱位移的插值强度，不重置原有物种状态。

## 13. Fireflies

萤火虫保留 local orbit、breathe 与 slow drift：

```math
X_{\mathrm{firefly}}(t)
=
X_{\mathrm{normal}}(t)
+\kappa_kD(a_k,t),
```

```math
\kappa_k\in[0.25,0.40].
```

它们与 tracer 共用 `\Gamma`，但耦合较弱，因此不会完全同步。

## 14. Grass

第 `k` 根草固定使用：

```math
a_k=(u_k,1).
```

摆角读取解析速度的横向分量：

```math
\theta_k(t)
=
\theta_{0,k}
+\kappa_kV_x(a_k,t).
```

根部位置不移动，草叶只作为场方向的稳定指示器。

## 15. 禁止项

Tracer 主逻辑不得引入：

- 每粒子独立随机 phase 或 amplitude；
- Perlin / Simplex / curl noise；
- 随机向量场；
- 粒子 advection；
- 母螺旋、backbone 或 attractor；
- RK2 位置积分；
- DOM 驱动的动力学偏折。

## 16. 最终公式

Field Mode 的数学链压缩为：

```math
\lambda_j=\beta m_j^{3/2},
```

```math
\Gamma(a,t)
=
\sum_jA_j(a)e^{i(\lambda_jt+\phi_j(a))},
```

```math
X_k(t)
=
\begin{pmatrix}
Wu_k\\
Hv_k
\end{pmatrix}
+s
\begin{pmatrix}
\Re\Gamma(a_k,t)\\
\Im\Gamma(a_k,t)
\end{pmatrix},
```

```math
\operatorname{Trail}_k(t)
=
\left\{
X_k(t-s):0\le s\le\Delta_k
\right\}.
```

最终层级是：

```text
one fractional spectrum
+ one global clock
+ one smooth two-parameter observation family
+ deterministic viewport coverage
+ analytic historical trails
```
