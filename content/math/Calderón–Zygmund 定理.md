---
obsidian-note-status:
  - colorful:completed
---


>[!note] Calderón–Zygmund 定理
>对任意 $1<p<\infty$，存在常数 $C_p>0$，使得对所有 $f\in L^p(\mathbb R^n)$ 都有
>$$\|Tf\|_{L^p(\mathbb R^n)} \le C_p\|f\|_{L^p(\mathbb R^n)}.$$


Calderón–Zygmund 定理是Calderón–Zygmund 分解的推广形式，在得到弱(1,1)型估计之后可以同理得到强(2,2)型，随后用积分得到$1 < p < 2$，再利用对偶即可扩展到完整的$L^p$空间。

分解要解决的核心问题，是奇异积分算子在端点 $p=1$ 处的强有界性通常失效。当 $1<p<\infty$ 时，奇异积分算子 $T$ 满足强 $(p,p)$ 型估计 $\|Tf\|_{L^p}\le C\|f\|_{L^p}$；但在 $p=1$ 时，一般不能期望得到强 $(1,1)$ 型估计，因此改为证明弱 $(1,1)$ 型估计：

$$
\bigl|\{x:|Tf(x)|>\alpha\}\bigr|
\le
\frac{C}{\alpha}\|f\|_{L^1},
\qquad \alpha>0.
$$


>[!tip]
>一个基本的思想来自[[分析学控制理论]]，把原函数写成 $f=g+b$。其中 $g$ 是良好部分，它在整个空间中都有统一的大小控制；$b$ 是坏部分，虽然局部振荡可能很大，但只集中在一些特定立方体中，而且在每个立方体上都具有均值为零的消去性质。


后面的证明正是利用这两种不同结构：$g$ 交给 $L^2$ 理论，$b$ 则交给核函数的光滑性和消去性质。

## 1. 坏立方体的构造

固定 $\alpha>0$，对 $\mathbb R^n$ 中的立方体进行二进分割。对每个立方体 $Q$，考察平均值 $\frac1{|Q|}\int_Q|f(x)|\,dx$。如果这个平均值大于 $\alpha$，就在这里停止细分，并把它记作坏立方体；如果平均值不超过 $\alpha$，就继续细分。

这样得到一族两两不交的极大坏立方体 $\{Q_j\}$，它们满足

$$
\alpha
<
\frac1{|Q_j|}\int_{Q_j}|f(x)|\,dx
\le
2^n\alpha.
$$

右边的上界来自极大性：$Q_j$ 的父立方体 $Q_j'$ 没有被选中，因此其平均值不超过 $\alpha$，而 $|Q_j'|=2^n|Q_j|$。

对于不落在任何坏立方体中的点，包含该点的二进立方体可以不断缩小，而且每一级的平均值都不超过 $\alpha$。由 Lebesgue 微分定理可知，几乎处处有 $|f(x)|\le\alpha$。

另一方面，由坏立方体上的下界可得 $\alpha|Q_j|<\int_{Q_j}|f|$。对所有 $j$ 求和，并利用 $Q_j$ 两两不交，得到

$$
\sum_j|Q_j|
\le
\frac1\alpha\|f\|_{L^1}.
$$

因此，坏行为虽然可能在局部很强，但只能集中在一个总测度很小的区域中。

## 2. 良好部分 $g$

在坏立方体外保持原函数不变，在每个坏立方体内则用该立方体上的平均值代替原函数：

$$
g(x)=
\begin{cases}
f(x), & x\notin\bigcup_jQ_j,\\[2mm]
\dfrac1{|Q_j|}\displaystyle\int_{Q_j}f(y)\,dy, & x\in Q_j.
\end{cases}
$$

坏立方体之外有 $|f(x)|\le\alpha$，坏立方体内部的平均值又至多为 $2^n\alpha$，因此 $\|g\|_{L^\infty}\le C\alpha$。同时 $\|g\|_{L^1}\le C\|f\|_{L^1}$，所以

$$
\|g\|_2^2
\le
\|g\|_\infty\|g\|_1
\le
C\alpha\|f\|_1.
$$

这说明 $g$ 已经被成功压进了 $L^2$ 理论可以处理的范围。

## 3. 坏部分 $b$

定义 $b=f-g$，并按坏立方体写成 $b=\sum_jb_j$，其中 $b_j$ 只支撑在 $Q_j$ 上，并定义为
$b_j(x)=\left(f(x)-\frac1{|Q_j|}\int_{Q_j}f(y)\,dy\right)\chi_{Q_j}(x)$。

最关键的性质是每个 $b_j$ 都满足

$$
\int_{Q_j}b_j(x)\,dx=0.
$$

这就是消去性质。它意味着 $b_j$ 虽然可能很大，但其平均值为零，因此在远离 $Q_j$ 的地方，可以把奇异核 $K(x-y)$ 改写成核函数之差，从而利用光滑性。

同时还有 $\sum_j\|b_j\|_1\le C\|f\|_1$。因此 Calderón–Zygmund 分解得到的结构可以概括为：$g$ 全局存在但幅值很小；$b$ 局部可能很大，但只集中在小区域中，并且每个局部块都具有零均值。

## 4. 用分解证明弱 $(1,1)$ 型估计

由线性性 $Tf=Tg+Tb$，因此
$\{|Tf|>\alpha\}\subset\{|Tg|>\alpha/2\}\cup\{|Tb|>\alpha/2\}$。于是分别估计 $Tg$ 和 $Tb$。

先处理 $g$。由 Chebyshev 不等式和 $T$ 的 $L^2$ 有界性，

$$
\bigl|\{|Tg|>\alpha/2\}\bigr|
\le
\frac{4}{\alpha^2}\|Tg\|_2^2
\le
\frac{C}{\alpha^2}\|g\|_2^2
\le
\frac{C}{\alpha}\|f\|_1.
$$

因此良好部分直接由 $L^2$ 理论控制。

再处理 $b$。将每个坏立方体 $Q_j$ 固定倍数放大为 $Q_j^*$，并记 $\Omega^*=\bigcup_jQ_j^*$。由于只是固定倍数膨胀，

$$
|\Omega^*|
\le
C\sum_j|Q_j|
\le
\frac{C}{\alpha}\|f\|_1.
$$

所以膨胀区域本身已经满足所需估计，只需处理 $x\notin\Omega^*$ 的情况。

设 $y_j$ 是 $Q_j$ 的中心。利用 $\int b_j=0$，可以把

$$
Tb_j(x)
=
\int_{Q_j}
\bigl[K(x-y)-K(x-y_j)\bigr]b_j(y)\,dy.
$$

这里的关键是，原来的奇异核被替换成了核函数在两个邻近点之间的差。当 $x$ 位于 $Q_j^*$ 外时，$x$ 已经与 $Q_j$ 充分分离，因此可以应用 Hörmander 型条件，对这个核差进行积分控制。于是得到

$$
\int_{(\Omega^*)^c}|Tb(x)|\,dx
\le
C\sum_j\|b_j\|_1
\le
C\|f\|_1.
$$

再由 Chebyshev 不等式，

$$
\bigl|
\{x\notin\Omega^*:|Tb(x)|>\alpha/2\}
\bigr|
\le
\frac{C}{\alpha}\|f\|_1.
$$

结合 $|\Omega^*|$ 的估计，就得到 $Tb$ 的弱型控制。最后将 $Tg$ 和 $Tb$ 合并，得到

$$
\bigl|\{x:|Tf(x)|>\alpha\}\bigr|
\le
\frac{C}{\alpha}\|f\|_{L^1}.
$$

因此 $T$ 满足弱 $(1,1)$ 型估计。

Calderón–Zygmund 分解的本质是：把 $L^1$ 函数中幅值过大的部分局部化，并通过减去局部平均值制造消去；剩余部分则被压到 $L^\infty$，从而可以进入 $L^2$ 理论。这样就把端点 $p=1$ 的困难拆成了“全局小量”和“局部消去”两个可以分别控制的问题。

