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

## 10. Tracer 的当前母螺旋模型

当前 tracer 不再积分二维速度场。整个 viewport 只有一条宏观母轨道：

```math
\Gamma(u,t)
=
C+r(u)e^{i\theta(u)}
+\varepsilon_r\operatorname{Re}q(u,t)e_r
+\varepsilon_\theta\operatorname{Im}q(u,t)e_\theta,
```

其中：

```math
r(u)=r_{\min}+(r_{\max}-r_{\min})(1-u)^{0.82},
\qquad
\theta(u)=\theta_0+2\pi(2.15u+0.12u^2),
```

```math
q(u,t)=
\sum_{m\in\{2,3,5,7,11,13\}}
a_m e^{i(2\pi mu-\beta m^{3/2}t+\phi_m)},
\qquad a_m\propto m^{-1.3}.
```

`r_max = 0.65` 倍 viewport 对角线，`r_min = 0.035` 倍短边，中心为 `(0.50W,0.48H)`，径向和切向谱形变分别为最大半径的 3.8% 与 6.0%。

第 `j` 个 tracer 解析采样：

```math
X_j(t)=\Gamma(u_j(t),t)+\delta_jN(u_j,t),
\qquad |\delta_j|\le10\text{ px}.
```

12 个历史样本覆盖 0.25–0.45 秒并直接构成弯曲 trail。出生相位预填在完整生命周期中，因此进入 Field Mode 时无需等待累积即可看见整条螺旋。

### 旧二维速度场模型说明

以下第 10a–11a 节只保留旧方案推导，不再作为 tracer 实现约束；其中的二维谱场仍可供花瓣、萤火虫等次级元素参考。

### 10a. Tracer 的全局谱场

网站 tracer 不直接把二维线性观测 z(t) 当作每个粒子的坐标。它退后一层，成为全局复值谱场的时间结构：

```math
\boxed{
\psi(x,t)
=
\sum_{m=1}^{M}
c_m e^{i(k_m\cdot x-\lambda_m t+\phi_m)}
}
```

其中：

```math
\lambda_m=\beta |m|^{3/2}.
```

c_m、k_m、φ_m 对所有 tracer 共享，不允许出现带粒子下标的 φ_im 或 c_im。这样 Hilbert 空间中的 fractional unitary evolution 先生成 ψ，再由 ψ 生成屏幕上的流。

定义：

```math
\operatorname{ReCurrent}
=
\operatorname{Re}(\bar\psi\nabla\psi),
```

```math
\operatorname{PhaseCurrent}
=
\operatorname{Im}(\bar\psi\nabla\psi).
```

选用共同速度场：

```math
\boxed{
v_\psi(x,t)
=
\frac{
\operatorname{PhaseCurrent}
+
\mu\operatorname{ReCurrent}
}{
|\psi|^2+\varepsilon
}
}
```

其中 ε 防止谱零点附近速度数值爆炸，μ 提供径向分量。

在 ψ 的简单零点附近，旋转分量近似 r^{-1}e_θ，径向分量近似 μr^{-1}e_r。二者结合产生一边旋转、一边径向迁移的局部螺旋，而不是固定中心附近的自转。

---

## 11a. Tracer 状态与 RK2（已废弃）

第 i 个 tracer 只保存：

```text
X_i = (x_i, y_i)
age_i
seed_i
```

seed 只用于初始位置、寿命、重生位置与视觉尺寸。所有 tracer 满足同一个方程：

```math
\dot X_i(t)=v_\psi(X_i(t),t).
```

离散推进使用 midpoint / RK2：

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

Tracer 的方向直接取当前位置的共同场速度：

```math
\vartheta_i(t)
=
\operatorname{atan2}
\left(
v_{\psi,y}(X_i,t),
v_{\psi,x}(X_i,t)
\right).
```

长度只与速度弱绑定并保持上界。禁止使用 center + orbit 重新计算位置。

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

## 15. 同一谱场，不同物种耦合

Tracer 共享完全相同的母轨道 `Γ`，只因出生相位和法向 lane 不同而位于同一条粒子河流的不同位置。

花瓣、萤火虫与草仍保留自己的物种动力，但可以用不同耦合系数读取同一个场：

```math
X_{\mathrm{tracer},j}
=
\Gamma(u_j,t)+\delta_jN(u_j,t),
```

```math
\dot X_{\mathrm{firefly}}
=
0.7v_\psi+0.3u_{\mathrm{local}},
```

```math
\dot X_{\mathrm{sakura}}
=
0.45v_\psi+g+w.
```

因此统一感来自共享 fractional clock。tracer 明确使用唯一母螺旋；花瓣、萤火虫和草仍保留各自物种动力并弱耦合旧二维谱场。

---

## 16. 点击交互：全局场的局部 phase impulse

Field Mode 下点击不添加独立粒子系统，也不修改某个 tracer 私有相位。

对点击位置 p，在全局谱场相位中加入短时、局部、确定性的偏置：

```math
\theta_m(x,t)
=
k_m\cdot x-\lambda_m t+\phi_m
+
A_m
\exp\left(
-\frac{\lVert x-p\rVert^2}{2\sigma^2}
\right)
\exp(-\kappa(t-t_0)).
```

附近所有 tracer 都读取同一个受扰形变项 `q(u,t)`。因此点击后母轨道局部发生短时谱形变，但频率、全局时钟和出生相位都不重置。

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

网页卡片不改变 `Γ`、`q` 或 tracer 的解析参数。当前实现只计算 alpha mask：FieldBack 穿组件时保留 `0.08–0.15`，FieldFront 保留 `0.55–0.70`，轨迹本身保持连续。

定义 canonical particle state：

```math
Y_i(t)=X_i(t),
\qquad
\dot X_i=v_\psi(X_i,t).
```

最终屏幕位置：

```math
X_i^{\mathrm{screen}}(t)
=
W_\Omega(Y_i(t)).
```

W_Ω 是由 DOM 几何决定的 soft warp。

因此：

```text
fractional spectral evolution
    ↓
global ψ(x,t)
    ↓
shared particle advection
    ↓
screen warp
    ↓
render
```

动力学和 UI 几何保持解耦。

---

## 19. Soft warp（已废弃）

以下公式只保留旧方案推导。当前 tracer 不应用 `W_Ω`。

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

## 23. WebGL2 解析式 instancing

当前后景 tracer 不保存位置状态。顶点着色器使用 `gl_InstanceID`、统一时间、确定性出生相位和 lane 参数，直接生成 `800 × 12 × 6` 量级的顶点；glow 与 core 各绘制一次。进入 Field Mode 时出生相位已经覆盖完整生命周期，因此不需要 warm-up。

### 旧 transform feedback 方案（已废弃）

后景 tracer 的位置是持久状态，不能由当前时间直接解析重算。

使用两组 GPU buffer 保存：

```text
x, y, age, seed
```

每帧流程：

```text
state A
  ↓ update shader + RK2
state B
  ↓ render shader
instanced tracer quads
  ↓ swap
state B becomes next input
```

Update shader 只调用共享的 fieldVelocityAt，不读取每粒子 phase 或 amplitude。Render shader在当前位置再次读取同一速度场，以决定短光丝方向。

---

## 24. Variable dt

解析式 tracer 不依赖帧间 `Δt`，标签页恢复后直接按统一时钟采样。以下 RK2 约束只适用于仍采用积分更新的旧方案或次级元素。

浏览器帧率不是严格固定。每帧使用实际 Δt，但对过大的间隔设上界，避免标签页恢复或卡顿后一帧跨越过远。

RK2 的两个采样时刻必须是：

```math
t_n,
\qquad
t_n+\frac{\Delta t}{2}.
```

性能档切换时保持全局谱时间不变。粒子状态可以在 Field Mode 淡出后冻结；再次进入时从原状态继续，不能重新随机整组 buffer。

---

## 25. 生命周期与数值稳定

当前 tracer 采用约 10 秒解析周期，周期首尾 alpha 淡入淡出；法向 lane 固定在 ±10 px，尾迹跨周期时直接截断，避免从内圈连到外圈。

Tracer 生命周期推荐 12–28 秒。寿命结束时：

1. alpha 完成淡出；
2. seed 确定性推进；
3. 在另一屏幕区域重置位置状态；
4. age 归零并淡入；
5. 全局 ψ、λ_m、c_m、k_m、φ_m 不变。

谱零点附近通过 ε 正则化分母，并对最终速度设置平滑上界。屏幕边界使用 wrap，以维持粒子数并避免硬碰撞。

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

当前版本使用：

```text
master spiral turns:
2.15 + quadratic 0.12

radius:
0.65 × viewport diagonal → 0.035 × short side

deformation:
radial 3.8%, tangential 6.0%

mode indices:
[2, 3, 5, 7, 11, 13]

active tracers:
500–900, about 650 at 1920×1080

front ratio:
about 15%

trail:
12 samples, 0.25–0.45 s

lane:
±10 px
```

以下为旧速度场第一版参数（已废弃）：

```text
alpha = 1.5
beta = 0.18

mode indices:
[2, 3, 5, 7, 11, 13]

shared wave directions:
[0.18, 1.35, 2.55, 3.58, 4.72, 5.68]

wave-number scale:
0.42

radial mix μ:
0.22

regularizer ε:
0.05

flow speed:
0.14

persistent state:
(x, y, age, seed)

lifetime:
12–28 s

integrator:
midpoint / RK2
```

这套参数的目标是产生少量缓慢迁移的谱涡旋，让大量 tracer 显示为共同流动，而不是增加粒子数量制造密度。

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

当前 tracer 动力链写成：

```math
\boxed{
X_j(t)
=
\Gamma(u_j(t),t)
+\delta_jN(u_j,t)
}
```

```math
\boxed{
\Gamma(u,t)
=
C+r(u)e^{i\theta(u)}
+\varepsilon_r\operatorname{Re}q(u,t)e_r
+\varepsilon_\theta\operatorname{Im}q(u,t)e_\theta
}
```

```math
\boxed{
q(u,t)
=
\sum_m a_m e^{i(2\pi mu-\beta m^{3/2}t+\phi_m)}
}
```

数学层级必须保持：

```text
fractional spectral clock
    ↓
one viewport-scale master spiral
    ↓
analytic curved trail samples
```

### 旧速度场核心公式（已废弃）

以下公式不再驱动 tracer，只作为旧方案和次级物种场的参考：

```math
\boxed{
\psi_t
=
e^{-it(-\Delta)^{3/4}}\psi_0
}
```

```math
\boxed{
v_\psi(x,t)
=
\frac{
\operatorname{Im}(\bar\psi\nabla\psi)
+
\mu\operatorname{Re}(\bar\psi\nabla\psi)
}{
|\psi|^2+\varepsilon
}
}
```

```math
\boxed{
\dot X_i(t)=v_\psi(X_i(t),t)
}
```

有限 mode 实现为：

```math
\boxed{
\psi(x,t)
=
\sum_{m=1}^{M}
c_m
e^{i(k_m\cdot x-\beta |m|^{3/2}t+\phi_m)}
}
```

数学层级必须保持：

```text
fractional unitary evolution
    ↓
global spectral field
    ↓
shared velocity field
    ↓
particle advection
```

不得退回“每个粒子各自拥有一条 Fourier orbit”的实现。
