## Quantum Dynamics & Perturbation Theory

Once you understand how to represent quantum states and how operators correspond to observables, the next step is to understand **how states evolve with time** and how to handle systems that cannot be solved exactly. This is the realm of **quantum dynamics** and **perturbation theory**.

### 3.1 Time Evolution of Quantum States

The time development of a quantum state is governed by the **time-dependent Schrödinger equation**:

$$
i\hbar \frac{\partial}{\partial t}|\psi(t)\rangle = \hat{H}(t)|\psi(t)\rangle.
$$

Here $\hat{H}(t)$ is the Hamiltonian operator, possibly time-dependent. The formal solution is:

$$
|\psi(t)\rangle = \hat{U}(t,t_0)|\psi(t_0)\rangle,
$$

where $\hat{U}(t,t_0)$ is the **time-evolution operator**.
If $\hat{H}$ is time-independent,

$$
\hat{U}(t)=e^{-i\hat{H}(t-t_0)/\hbar}.
$$

This operator is **unitary**: $\hat{U}^\dagger \hat{U}=\mathbb{I}$, which preserves normalization and total probability.

### 3.2 Stationary States and Energy Eigenstates

For a time-independent Hamiltonian, one can solve the **time-independent Schrödinger equation**:

$$
\hat{H}|\phi_n\rangle=E_n|\phi_n\rangle.
$$

The eigenstates $|\phi_n\rangle$ are called **stationary states** because, apart from an overall phase $e^{-iE_nt/\hbar}$, they do not change shape in time. Any general state can be written as a linear combination of these stationary states:

$$
|\psi(t)\rangle=\sum_n c_n e^{-iE_n t/\hbar}|\phi_n\rangle.
$$

The coefficients $c_n$ are fixed by the initial condition.

### 3.3 The Heisenberg and Interaction Pictures

Quantum mechanics can be formulated in different but equivalent pictures:

* **Schrödinger picture:** States evolve in time; operators are fixed.
* **Heisenberg picture:** Operators carry the time dependence:

  $$
  \hat{A}_H(t)=\hat{U}^\dagger(t)\hat{A}\hat{U}(t),
  $$

  while states remain fixed.
* **Interaction picture:** Used especially in perturbation theory; both states and operators evolve partially, which simplifies calculations when $\hat{H}=\hat{H}_0+\hat{V}(t)$.

These pictures are mathematically equivalent but often one is more convenient depending on the problem.

### 3.4 Conservation Laws

If an operator $\hat{A}$ commutes with the Hamiltonian, $[\hat{A},\hat{H}]=0$, then its expectation value is **constant in time**:

$$
\frac{d}{dt}\langle \hat{A}\rangle=0.
$$

This is the quantum version of a conservation law (energy, momentum, angular momentum, etc.).

### 3.5 Motivation for Perturbation Theory

Most real systems cannot be solved exactly. However, many can be written as:

$$
\hat{H}=\hat{H}_0+\lambda\hat{V},
$$

where $\hat{H}_0$ is exactly solvable, $\hat{V}$ is a “small” perturbation, and $\lambda$ is a bookkeeping parameter (later set to 1). **Perturbation theory** gives approximate energies and states in powers of $\lambda$.

There are two major types:

* **Time-independent perturbation theory** (for small static changes in the Hamiltonian).
* **Time-dependent perturbation theory** (for external fields, transitions, and scattering).

### 3.6 Time-Independent Perturbation Theory

Suppose $\hat{H}_0|\phi_n^{(0)}\rangle=E_n^{(0)}|\phi_n^{(0)}\rangle$ are known. We want the energies and states of $\hat{H}_0+\hat{V}$.

We expand:

$$
E_n=E_n^{(0)}+\lambda E_n^{(1)}+\lambda^2E_n^{(2)}+\dots
$$

$$
|\phi_n\rangle=|\phi_n^{(0)}\rangle+\lambda|\phi_n^{(1)}\rangle+\dots
$$

The first-order energy shift:

$$
E_n^{(1)}=\langle\phi_n^{(0)}|\hat{V}|\phi_n^{(0)}\rangle.
$$

The first-order correction to the state:

$$
|\phi_n^{(1)}\rangle=\sum_{m\neq n}\frac{\langle\phi_m^{(0)}|\hat{V}|\phi_n^{(0)}\rangle}{E_n^{(0)}-E_m^{(0)}}|\phi_m^{(0)}\rangle.
$$

This is powerful for small perturbations like the Stark effect (electric field shifts atomic levels) or Zeeman effect (magnetic field splitting).

### 3.7 Degenerate Perturbation Theory

If $E_n^{(0)}$ is degenerate, the naive formula above blows up. In that case, we first diagonalize $\hat{V}$ within the degenerate subspace to find the correct linear combinations that diagonalize the perturbation. This is how you explain fine-structure splitting in atoms.

### 3.8 Time-Dependent Perturbation Theory

When the perturbation itself depends on time (e.g., an atom in an oscillating electromagnetic field), we use **time-dependent perturbation theory**.

We start from:

$$
i\hbar \frac{\partial}{\partial t}|\psi_I(t)\rangle=\hat{V}_I(t)|\psi_I(t)\rangle,
$$

in the interaction picture. We expand the state coefficients to first order in $\hat{V}$:

$$
c_m^{(1)}(t)=\frac{1}{i\hbar}\int_{t_0}^{t} \langle m|\hat{V}_I(t')|n\rangle e^{i\omega_{mn}t'} dt',
$$

where $\omega_{mn}=(E_m-E_n)/\hbar$.

This expression gives the **transition amplitude** from state $n$ to $m$. The squared modulus gives the transition probability.

### 3.9 Fermi’s Golden Rule

For a perturbation oscillating at frequency $\omega$, the transition rate from $|n\rangle$ to a continuum of final states is given by **Fermi’s golden rule**:

$$
\Gamma_{n\to m}=\frac{2\pi}{\hbar}|\langle m|\hat{V}|n\rangle|^2\rho(E_m),
$$

where $\rho(E_m)$ is the density of final states. This is the basis of calculating absorption and emission rates, scattering cross sections, and many processes in atomic and nuclear physics.

### 3.10 Adiabatic and Sudden Approximations

If the Hamiltonian changes very slowly compared to the system’s internal dynamics, the **adiabatic theorem** says the system stays in an instantaneous eigenstate of $\hat{H}(t)$. This underpins ideas like Berry’s phase.

Conversely, if the Hamiltonian changes very quickly (sudden approximation), the state has no time to adjust and remains essentially the same during the change.

### 3.11 Quantum Dynamics Beyond Perturbation

For strong perturbations or non-perturbative phenomena (e.g., tunneling in double-well potentials), perturbation theory may fail, and you need numerical methods or alternative approximations (variational methods, WKB, path integrals).

### 3.12 Summary of Key Points

* **Time evolution** of quantum states is governed by the Schrödinger equation and the unitary time-evolution operator.
* **Stationary states** evolve only by a phase; any state can be decomposed into them.
* **Heisenberg and interaction pictures** provide alternative but equivalent views of dynamics.
* **Conserved quantities** correspond to operators commuting with the Hamiltonian.
* **Time-independent perturbation theory** gives approximate energy levels and states for small static changes.
* **Time-dependent perturbation theory** handles transitions due to external fields; **Fermi’s golden rule** gives transition rates.
* **Adiabatic theorem** explains behavior under slow changes; the sudden approximation handles fast ones.
* Beyond small perturbations, one must resort to non-perturbative or numerical approaches.

This framework is the workhorse for practical quantum mechanics — from explaining atomic spectra and scattering to designing lasers and understanding quantum control.

---

Would you like me to move on and write the final **2–3 pages** on the fourth subtopic — **Quantum Systems & Applications**?
