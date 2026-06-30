# 30-Days-Quantum-Challenge Week - 1

# 🔬 Quantum Randomn Number Generator 

A beginner-friendly quantum computing project built using **Python**, **Qiskit**, and **Qiskit Aer** to explore the fascinating concept of **quantum randomness**. This project demonstrates how quantum superposition can be used to generate truly random numbers and compares them with classical pseudo-random number generation.

## 🚀 Project Overview

The **Quantum Randomness Laboratory** uses a single qubit quantum circuit with a Hadamard gate to create a superposition state. Upon measurement, the qubit collapses randomly to either `0` or `1`, producing quantum-generated random numbers.

This project includes:

* ✅ Quantum Random Number Generation (QRNG)
* 📊 Histogram visualization of quantum measurement results
* 📈 Statistical analysis of generated random numbers
* ⚖️ Comparison between classical and quantum randomness
* 🔬 Basic exploration of quantum superposition and measurement

## 🛠️ Technologies Used

* Python
* Qiskit
* Qiskit Aer Simulator
* Matplotlib
* NumPy
* SciPy
* Jupyter Notebook

## 📂 Project Structure

```bash
Quantum-Randomness-Lab/
│
├── qrng.py            # Quantum random number generator
├── histogram.py       # Histogram visualization
├── statistics.py      # Statistical analysis
├── comparison.py      # Classical vs Quantum comparison
└── README.md
```

## ⚛️ Quantum Circuit

The project uses a simple one-qubit quantum circuit:

```
     ┌───┐┌─┐
q_0: ┤ H ├┤M├
     └───┘└╥┘
c: 1/══════╩═
           0
```

* **Hadamard Gate (H):** Creates quantum superposition.
* **Measurement (M):** Produces a truly random outcome of `0` or `1`.

## 📊 Expected Output

```python
Quantum Random Numbers
{'0': 503, '1': 497}
```

The results demonstrate approximately equal probabilities of obtaining `0` and `1`, validating the probabilistic nature of quantum mechanics.

## 🎯 Learning Outcomes

Through this project, I learned:

* Fundamentals of quantum computing and superposition
* Building quantum circuits using Qiskit
* Quantum measurement and randomness generation
* Statistical analysis of quantum data
* Visualization of quantum experiment results
* Differences between classical pseudo-randomness and quantum randomness

## 🌟 Future Improvements

* Implement multi-qubit quantum random number generators
* Perform advanced randomness testing
* Execute the circuit on real IBM Quantum hardware
* Explore quantum cryptography applications

---

