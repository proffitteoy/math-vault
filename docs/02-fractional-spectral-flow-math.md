# Fractional Spectral Flow 数学轨迹模型

> 目标：给网站动画定义一套真正来自泛函分析 / 算子理论的长期运动规律。  
> 选定方案：Hilbert 空间上的 fractional unitary flow，并通过有界线性观测得到二维轨迹。

---

## 1. Hilbert 空间

取

```math
H=L^2(S^1).
```

使用标准 Fourier 基：

```math
e_m(\theta)=e^{im\theta},
\qquad m\in\mathbb Z.
```

圆周上的 Laplace 算子满足

```math
-\Delta e_m=m^2e_m.
```

因此 Fourier 基也是 `-Δ` 的特征基。

---

## 2. Fractional operator

定义

```math
A_\alpha=(-\Delta)^{\alpha/2}.
```

通过谱演算：

```math
A_\alpha e_m
=
|m|^\alpha e_m.
```

本项目选

```math
\alpha=\frac32.
```

于是

```math
A=(-\Delta)^{3/4},
```

且

```math
Ae_m
=
|m|^{3/2}e_m.
```

这一步是整个模型的核心。

它不是人为规定“第 m 个正弦波频率等于某个数”，而是从自伴算子的 functional calculus 得到。

---

## 3. 一参数酉群

因为 `A` 是自伴算子，可定义

```math
U(t)=e^{itA}.
```

`U(t)` 是 Hilbert 空间上的一参数酉群。

满足：

```math
U(t+s)=U(t)U(s),
```

以及

```math
\lVert U(t)f\rVert_H=\lVert f\rVert_H.
```

因此轨道不会像 dissipative flow 那样自动衰减到零。

这正适合作为长期网页动画：

- 不需要重新“注入能量”；
- 不会自然吸到一个 attractor；
- 不会因为时间增长而爆炸；
- 可以永久运行。

---

## 4. Fourier 展开

令初始态

```math
f
=
\sum_m a_me_m.
```

则

```math
U(t)f
=
\sum_m
a_m e^{i|m|^{3/2}t}e_m.
```

每个谱分量只发生 phase rotation。

因此系统的“运动”本质是：

```text
Hilbert-space vector
    ↓
each spectral coordinate rotates
    ↓
the whole state moves on an infinite-dimensional torus
```

实际网站只保留有限个 mode。

---

## 5. 从无限维状态到二维轨迹

屏幕只能显示二维位置。

取一个有界线性泛函

```math
\ell:H\to\mathbb C.
```

定义

```math
z(t)
=
\ell(U(t)f).
```

写成有限谱展开：

```math
\boxed{
z(t)
=
\sum_{j=1}^{N}
c_j
e^{i\lambda_j t}
}
```

其中

```math
\lambda_j
=
\beta m_j^{3/2}.
```

`β > 0` 是全局时间尺度。

屏幕坐标：

```math
x(t)=\Re z(t),
```

```math
y(t)=\Im z(t).
```

因此二维轨迹不是直接规定出来的。

它是：

```text
unitary orbit
    ↓
bounded linear observation
    ↓
complex scalar
    ↓
2D position
```

---

## 6. 推荐 mode indices

推荐使用不同 square-free part 的 mode：

```text
m = 2, 3, 5, 7, 11, 13, 17, 19
```

原因：

```math
\lambda_m
=
m^{3/2}
=
m\sqrt m.
```

这些频率之间通常不存在简单整数比例。

因此有限维 phase vector

```math
(
e^{i\lambda_1t},
\dots,
e^{i\lambda_Nt}
)
```

会产生长期 quasi-periodic motion。

视觉上：

- 短时间有明显局部规律；
- 中期不会机械闭合；
- 长时间会不断出现新的相位组合；
- 不需要随机游走。

---

## 7. 为什么选 α = 3/2

若

```math
\alpha=1,
```

频率是整数阶：

```math
\lambda_m=m.
```

过于接近普通 Fourier / epicycle。

若

```math
\alpha=2,
```

得到经典 Schrödinger spectrum：

```math
\lambda_m=m^2.
```

理论非常经典，但大量 mode 之间仍有明显整数结构。

选

```math
\alpha=\frac32
```

则：

```math
\lambda_m=m^{3/2}.
```

优势：

1. 仍然来自标准 fractional functional calculus。
2. 比普通 Fourier orbit 更少出现明显重复。
3. 不需要引入随机噪声。
4. 视觉复杂度足够高。
5. 计算仍然只是复指数旋转。

---

## 8. 系数设计

写

```math
c_j=r_je^{i\phi_j}.
```

其中：

- `r_j` 控制第 j 个谱 mode 的贡献；
- `φ_j` 是初始相位。

推荐 amplitude envelope：

```math
r_j
=
C(j+j_0)^{-p},
```

其中推荐

```text
p = 1.2–1.8
```

这样：

- 低频决定整体轮廓；
- 高频增加细节；
- 高频不会把轨迹撕碎。

归一化：

```math
\sum_j r_j=1.
```

或者：

```math
\sum_j r_j^2=1.
```

两种都可以。

前者更容易直接控制屏幕半径。

---

## 9. 有界性

有限和满足：

```math
|z(t)|
\le
\sum_{j=1}^{N}|c_j|.
```

因此只要系数固定，轨迹天然被限制在一个有界区域。

不需要额外 clamp。

长期覆盖区域也可直接由系数解释。写成：

```math
c_j=r_je^{i\phi_j}.
```

当 `m_j = 2, 3, 5, 7, 11, 13` 具有不同的 square-free part 时，频率之间不存在非平凡整数线性关系。Kronecker 型稠密性说明相位向量在 `N` 维 torus 上稠密，因此轨道闭包是可旋转向量和形成的 annulus：

```math
r_-\le |z|\le r_+,
\qquad
r_+=\sum_jr_j,
\qquad
r_-=\max\left(2\max_jr_j-\sum_jr_j,0\right).
```

当前平缓 amplitude envelope 满足 `r_-=0`，所以长期轨道闭包覆盖整个圆盘，而不是收敛到大圆或 attractor。

二维观测再复合 viewport affine map：

```math
\Gamma(t)
=
b+M
\begin{pmatrix}
\Re z(t)\\
\Im z(t)
\end{pmatrix}.
```

`M` 随 viewport 宽高独立缩放，使长期覆盖区域映射到整个绘图区；这仍然是 bounded linear observation 后的可逆 affine 变换，不改变轨道结构。

---

## 10. Tracer：同一条 fractional spectral orbit 的时间截面

整个 tracer 系统只使用一条轨道：

```math
\gamma(t)
=
\sum_{j=1}^{N}c_je^{i\beta m_j^{3/2}t}.
```

第 `k` 个 tracer 只是它的时间平移：

```math
\boxed{
X_k(t)
=
b+M
\begin{pmatrix}
\Re\gamma(t+\tau_k)\\
\Im\gamma(t+\tau_k)
\end{pmatrix}
}
```

等价地，每个 mode 的相位只能写成 `φ_j + λ_jτ_k`。不允许为粒子生成独立的 `φ_{j,k}`、amplitude、中心、lane 或速度尺度，否则会产生另一条轨道。

当前全质量配置为 `600` 个 tracer、`T_cover = 180 s`：

```math
\tau_k
=
\frac{k+1/2}{600}T_{\mathrm{cover}}
+\epsilon_k,
```

其中 `ε_k` 只允许是远小于相邻间距的确定性 time jitter。任意真实时刻，600 个时间截面同时显影同一条轨道在 180 秒窗口中的整体结构；后景使用 510 个截面，前景使用其后的 90 个截面。

每根尾迹也必须从同一条 `γ` 解析采样：

```math
\boxed{
\operatorname{Trail}_k(t)
=
\{X_k(t-s):0\le s\le\Delta_k\}
}
```

实现使用 16 个历史采样点，`Δ_k = 0.25–0.40 s`。尾迹是实际局部曲线，不是根据瞬时速度绘制的直 quad。

---

## 11. Sakura 的轨迹

花瓣不能完全做纯闭合谱 orbit，因为它必须持续下落。

因此使用：

```math
X_{\mathrm{sakura}}(t)
=
X_0
+
V_{\mathrm{fall}}t
+
\varepsilon
\begin{pmatrix}
\Re z(t)\\
\eta\,\Im z(t)
\end{pmatrix}.
```

其中：

```math
z(t)
=
\sum_{j=1}^{N_s}
c_je^{i\lambda_jt}.
```

推荐：

```text
Ns = 3–5
η = 0.2–0.5
```

解释：

- `V_fall t` 决定长期下降；
- `Re z(t)` 决定主要横向摆动；
- `Im z(t)` 只提供较小竖直 flutter；
- spin / twist / squash 继续作为姿态变量单独处理。

如果使用 wrap：

```math
y(t)
\mapsto
y(t)\bmod H,
```

则花瓣可长期存在。

---

## 12. Fireflies 的轨迹

萤火虫不需要线性 drift。

建议：

```math
X_{\mathrm{firefly}}(t)
=
X_c
+
s
\begin{pmatrix}
\Re z(t)\\
\Im z(t)
\end{pmatrix},
```

其中：

```math
z(t)
=
\sum_{j=1}^{N_f}
c_je^{i\lambda_jt}.
```

推荐：

```text
Nf = 3–5
```

比 tracer 少。

原因：

- 萤火虫应该有清晰的大尺度游走；
- 太多 mode 会显得像高频抖动；
- glow 已经提供额外动态层次。

亮度：

```math
I(t)
=
I_0
+
I_1
\sin(\omega_gt+\rho).
```

`ω_g` 不要取任意 `λ_j`，避免亮度和空间运动锁相。

---

## 13. Grass 的轨迹

Grass 不是平面位置轨迹，而是角度轨迹。

第 q 根草：

```math
\theta_q(t)
=
\theta_{0,q}
+
\Re
\sum_{j=1}^{N_g}
d_{q,j}
e^{i(k_jx_q-\lambda_jt+\phi_{q,j})}.
```

推荐：

```text
Ng = 3–4
```

相邻草的参数不能完全独立随机。

应让：

```math
\phi_{q+1,j}-\phi_{q,j}
```

随 `q` 平滑变化。

这样产生 travelling spectral wave，而不是 150 根独立摆动。

---

## 14. 同一谱场，不同物种耦合

Tracer 严格使用同一条 `γ`，差异只有时间平移 `τ_k`：

```math
X_{\mathrm{tracer},j}
=
b+M
\begin{pmatrix}
\Re\gamma(t+\tau_j)\\
\Im\gamma(t+\tau_j)
\end{pmatrix}.
```

花瓣、萤火虫与草保留第 11–13 节定义的物种动力，只共享 `λ_j = βm_j^{3/2}` 这组 fractional clock。它们不参与 tracer 的位置计算，也不能引入粒子私有谱相位。

---

## 15. 点击交互

Field Mode 下点击不添加独立粒子系统，也不修改 `γ`、`τ_k` 或任何 mode phase。Normal Mode 原有 ripple 保留，二者互不影响。

---

## 16. Pointer move

Pointer move 不参与 tracer 数学链，避免把同一条时间平移轨道改成依赖屏幕位置的另一套动力系统。

---

## 17. DOM obstacle：只改变 alpha

网页卡片不改变 `γ`、`τ_k`、`b` 或 `M`。当前实现只根据 DOM 矩形计算 alpha mask：FieldBack 穿组件时保留约 `0.11`，FieldFront 按现有前景遮罩衰减，轨迹位置和尾迹采样始终连续。

因此：

```text
one fractional spectral orbit
    ↓
time translations τ_k
    ↓
viewport affine map
    ↓
obstacle alpha mask
    ↓
render
```

动力学和 UI 几何保持解耦。

---

## 18. 低性能档的数学降级

Normal Mode 不需要抛弃这套模型。

只减少 mode 数：

```text
Tracer: disabled
Sakura: 2–3 modes
Fireflies: 2–3 modes
Grass: 2 modes
```

并保持：

```text
30 FPS
Canvas2D
```

如果继续沿用当前实现，也可以暂时保持旧 quasi-periodic 公式。

但未来最好仍然共享同一 spectral clock。

---

## 19. 高性能档参数

推荐第一版：

```text
alpha = 1.5

mode indices:
[2, 3, 5, 7, 11, 13, 17, 19]

beta:
0.12–0.25

tracer modes:
6–8

firefly modes:
3–5

sakura modes:
3–5

grass modes:
3–4
```

不同对象只使用公共列表的不同子集。

---

## 20. 防止高频过强

因为：

```math
\lambda_m=m^{3/2},
```

高 mode 的速度会快速增加。

因此系数不能平坦。

推荐：

```math
r_j
\propto
\lambda_j^{-\gamma},
```

其中：

```text
γ = 0.7–1.1
```

或者直接：

```math
r_j
\propto
(j+j_0)^{-p}.
```

这样高 mode 负责细节，而不是支配速度。

---

## 21. WebGL2 解析式 instancing

当前后景 tracer 不保存位置状态。顶点着色器使用 `gl_InstanceID`、统一时间和确定性 `τ_k`，直接计算 `γ(t+τ_k-s)`。全质量后景为 `510 × 15 × 6` 个三角形顶点，glow 与 core 各绘制一次。

进入 Field Mode 时 600 个 `τ_k` 已覆盖完整 `T_cover`，不需要 warm-up、位置 buffer 或积分更新。

---

## 22. Variable dt

解析式 tracer 不依赖帧间 `Δt`。每帧只从统一绝对时钟求值；标签页恢复或性能档切换后，直接在新的 `t` 上采样同一条 `γ`，无需追赶或恢复粒子状态。

---

## 23. 长期连续性与数值稳定

Tracer 没有独立生命周期、重生、wrap 或位置重置。`τ_k` 固定，`γ` 是有限复指数和，始终有界；只需保持统一时间精度，并在计算当前启用 mode 的 amplitude sum 时防止除以零。

---

## 24. 全局时间连续性

切换性能档时必须保持：

```math
t_{\mathrm{field}}
=
t_{\mathrm{normal}}.
```

不能重新设 `t = 0`。

因此所有模式：

```text
Normal
Field
Light
Dark
```

共享同一个：

```text
global spectral time
```

只有系数、可见对象和 render path 变化。

---

## 25. 轨迹的几何解释

有限 mode 情况下，定义：

```math
\Theta(t)
=
(
e^{i\lambda_1t},
\dots,
e^{i\lambda_Nt}
).
```

它运行在 N 维 torus：

```math
\mathbb T^N.
```

二维轨迹：

```math
z(t)
=
\sum_j c_j\Theta_j(t)
```

是这个 torus 轨道经过一个线性观测后的投影。

因此视觉上的“复杂曲线”不是混沌。

它是：

```text
quasi-periodic torus motion
    ↓
linear observation
    ↓
2D spectral orbit
```

---

## 26. 为什么长期不会死

有三个原因。

第一：

```math
|e^{i\lambda_jt}|=1.
```

每个 mode 振幅恒定。

第二：

```math
\lVert U(t)f\rVert
=
\lVert f\rVert.
```

整体 Hilbert norm 守恒。

第三：

没有：

```text
negative real eigenvalue
damping
gradient descent
attractor
```

因此它可以无限运行而不趋于一点。

---

## 27. 为什么不会太规则

若所有频率都有共同基本频率：

```math
\lambda_j=n_j\omega_0,
```

轨迹会周期闭合。

本项目通过：

```math
\lambda_j=\beta m_j^{3/2}
```

并选择不同 square-free part 的 `m_j`，尽量避免简单整数关系。

因此得到长期 quasi-periodicity。

---

## 28. 推荐默认 tracer preset

当前版本使用：

```text
mode indices:
[2, 3, 5, 7, 11, 13]

amplitudes:
[0.42, 0.36, 0.30, 0.25, 0.20, 0.16]

beta:
0.18

active tracers:
600 at full quality

time coverage:
180 s

background / foreground:
510 / 90

trail:
16 samples, 0.25–0.40 s

day core / glow:
2.8–3.8 px / 8–12 px

night core / glow:
2.5–3.5 px / 8–12 px

head:
4–6 px
```

---

## 29. 推荐默认 species preset

### Sakura

```text
modes: 2, 3, 5, 7
spectral scale: medium
vertical drift: strong
vertical spectral contribution: weak
```

### Fireflies

```text
modes: 2, 3, 5, 11
spectral scale: small
centered orbit
breathe: independent
```

### Grass

```text
modes: 2, 3, 5
spatial phase shift: smooth
high-frequency amplitude: low
```

### Tracer

```text
modes: 2, 3, 5, 7, 11, 13
one shared orbit
600 deterministic time translations over 180 s
foreground subset: 90
```

---

## 30. 最终核心公式

Tracer 数学只保留三行：

```math
\boxed{
z(t)
=
\sum_j c_je^{i\beta m_j^{3/2}t}
}
```

```math
\boxed{
X_k(t)
=
b+M
\begin{pmatrix}
\Re z(t+\tau_k)\\
\Im z(t+\tau_k)
\end{pmatrix}
}
```

```math
\boxed{
\operatorname{Trail}_k(t)
=
\{X_k(t-s):0\le s\le\Delta\}
}
```

600 个粒子不是 600 条曲线，而是同一条 fractional spectral orbit 上的 600 个时间截面。数学层级必须保持：

```text
one fractional spectral orbit z(t)
    ↓
600 time translations z(t + τ_k)
    ↓
viewport affine map
    ↓
true historical trail samples
```
