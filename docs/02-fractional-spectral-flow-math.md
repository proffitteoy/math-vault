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

屏幕映射可写成：

```math
X(t)
=
X_c
+
s
\begin{pmatrix}
\Re z(t)\\
\Im z(t)
\end{pmatrix}.
```

其中：

- `X_c`：轨迹中心；
- `s`：局部尺度。

---

## 10. Tracer 的标准轨迹

第 q 个 tracer：

```math
z_q(t)
=
\sum_{j=1}^{N}
r_{q,j}
e^{i(\lambda_jt+\phi_{q,j})}.
```

推荐：

```text
N = 6–8
```

每个 tracer：

- 共享同一个 `λ_j`；
- 使用不同 `r_{q,j}`；
- 使用不同 `φ_{q,j}`；
- 有自己的 `center_q`；
- 有自己的 `scale_q`。

因此：

```text
shared spectrum
+ different observables
= coherent but non-identical trajectories
```

这就是 Field Mode 的统一感来源。

---

## 11. Tracer 速度

轨迹导数：

```math
\dot z_q(t)
=
i
\sum_{j=1}^{N}
\lambda_j r_{q,j}
e^{i(\lambda_jt+\phi_{q,j})}.
```

因此瞬时速度可以直接得到，不需要有限差分。

屏幕速度：

```math
V_q(t)
=
s_q
\begin{pmatrix}
\Re\dot z_q(t)\\
\Im\dot z_q(t)
\end{pmatrix}.
```

Tracer 朝向取：

```math
\vartheta_q(t)
=
\operatorname{atan2}(V_{q,y},V_{q,x}).
```

线段长度可取：

```math
L_q(t)
=
L_0
+
\kappa
\frac{\lVert V_q(t)\rVert}
{1+\lVert V_q(t)\rVert}.
```

这样长度随速度增加，但始终有上界。

---

## 12. Sakura 的轨迹

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

## 13. Fireflies 的轨迹

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

## 14. Grass 的轨迹

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

## 15. 同一 spectrum，不同 observable

整个网站不要让所有对象共享同一个 `z(t)`。

正确模型是：

```math
z_q(t)
=
\ell_q(U(t)f_q).
```

`U(t)` 相同。

但：

```math
f_q
```

和

```math
\ell_q
```

可以不同。

有限维实现里，这等价于：

```text
same λ_j
different c_qj
```

这正是泛函分析意义上最自然的“同一动力系统，不同观测”。

---

## 16. 点击交互：phase impulse

Field Mode 下点击不要添加一个外部随机力。

保持 spectral family 的做法是修改初始相位。

对点击位置 `p`，第 q 个对象距离为：

```math
d_q
=
\lVert X_q-p\rVert.
```

局部 phase kick：

```math
\phi_{q,j}
\leftarrow
\phi_{q,j}
+
A
\exp
\left(
-\frac{d_q^2}{2\sigma^2}
\right)
\xi_j.
```

其中 `ξ_j` 是预先固定的 mode 权重。

这样点击后：

- 轨迹立即偏转；
- 频率不变；
- 仍然属于同一谱流；
- 不需要额外物理系统。

---

## 17. Pointer move：弱 phase bias

鼠标移动只做小扰动：

```math
\phi_{q,j}(t)
=
\phi_{q,j}^{(0)}
+
\varepsilon
w(d_q)
g_j(p_t).
```

`ε` 必须很小。

目标不是“粒子追鼠标”，而是鼠标附近的谱相位发生轻微偏移。

---

## 18. DOM obstacle：只改变 screen embedding

网页卡片不应该改变 `U(t)`。

否则基础算子会依赖页面布局，数学结构会变得混乱。

定义 canonical position：

```math
Y_q(t)
=
X_{c,q}
+
s_q
\begin{pmatrix}
\Re z_q(t)\\
\Im z_q(t)
\end{pmatrix}.
```

最终屏幕位置：

```math
X_q(t)
=
W_\Omega(Y_q(t)).
```

`W_Ω` 是由 DOM 几何决定的 soft warp。

因此：

```text
spectral dynamics
    ↓
canonical orbit
    ↓
screen warp
    ↓
render
```

算子动力学和 UI 几何保持解耦。

---

## 19. Soft warp

对每个组件区域 `Ω_k`，设 signed distance：

```math
d_k(x).
```

外法向：

```math
n_k(x)
=
\nabla d_k(x).
```

定义局部偏折：

```math
W_\Omega(x)
=
x
+
\sum_k
\rho_k(d_k(x))
n_k(x).
```

例如：

```math
\rho_k(d)
=
a_k
\exp
\left(
-\frac{d^2}{\sigma_k^2}
\right).
```

只在组件附近产生轻微偏折。

注意：

- 这不是碰撞模拟；
- 不需要满足真实流体边界条件；
- 它只是 screen-space embedding。

---

## 20. 低性能档的数学降级

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

## 21. 高性能档参数

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

## 22. 防止高频过强

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

## 23. 高效递推

直接每帧计算：

```math
e^{i\lambda_jt}
```

会调用大量 `sin/cos`。

更适合 GPU / JS 的方法是递推。

记：

```math
u_j(t)
=
e^{i\lambda_jt}.
```

固定帧间隔 `Δt`：

```math
g_j
=
e^{i\lambda_j\Delta t}.
```

则：

```math
u_j(t+\Delta t)
=
u_j(t)g_j.
```

即每个 mode 每帧只需要一次复数乘法。

对第 q 个 tracer：

```math
u_{q,j}(0)
=
e^{i\phi_{q,j}}.
```

之后：

```math
u_{q,j}
\leftarrow
u_{q,j}g_j.
```

最后：

```math
z_q
=
\sum_j r_{q,j}u_{q,j}.
```

这非常适合大量 tracer。

---

## 24. Variable dt

浏览器帧率不是严格固定。

若 `Δt` 变化，可以每帧计算全局：

```math
g_j(\Delta t)
=
e^{i\lambda_j\Delta t}.
```

然后所有 tracer 共享同一个 `g_j`。

因此每帧 trig 次数约为：

```text
number of modes
```

而不是：

```text
number of tracers × number of modes
```

---

## 25. 数值漂移

持续复乘会有模长漂移。

因此每隔若干帧做：

```math
u_{q,j}
\leftarrow
\frac{u_{q,j}}{|u_{q,j}|}.
```

或者周期性根据：

```math
\lambda_j t+\phi_{q,j}
```

重新计算一次精确相位。

推荐：

```text
每 2–5 秒 re-normalize
每 20–60 秒 exact resync
```

---

## 26. 全局时间连续性

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

## 27. 轨迹的几何解释

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

## 28. 为什么长期不会死

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

## 29. 为什么不会太规则

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

## 30. 推荐默认 tracer preset

第一版可以直接用：

```text
alpha = 1.5
beta = 0.18

modes:
[2, 3, 5, 7, 11, 13]

amplitude envelope:
r_j ∝ (j + 1.5)^(-1.4)

phase:
φ_qj = hash(seed, q, j) × 2π

center:
side-weighted random distribution

scale:
0.03–0.12 viewport width

lifetime:
8–20 s
```

这已经足够产生明显但不俗套的谱轨迹。

---

## 31. 推荐默认 species preset

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
spectral scale: variable
foreground subset: sparse
```

---

## 32. 最终核心公式

整个网站的数学核心可以写成：

```math
\boxed{
\gamma_q(t)
=
\Pi_q
\left(
e^{it(-\Delta)^{3/4}}f_q
\right)
}
```

其中：

- `f_q`：第 q 个可视对象的初始态；
- `e^{it(-Δ)^{3/4}}`：统一 fractional unitary flow；
- `Π_q`：对象自己的二维观测。

有限维实现就是：

```math
\boxed{
z_q(t)
=
\sum_{j=1}^{N_q}
c_{q,j}
e^{i\beta m_j^{3/2}t}.
}
```

这是最终应当真正写进实现的轨迹公式。
