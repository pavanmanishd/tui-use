---
category: repls
---
`/home/agent/work/sensor.py` simulates a slow sensor. Start the Python REPL with `python3` in `/home/agent/work` and, in one REPL session:

1. `import sensor`
2. create a sensor with `s = sensor.Sensor()` (calibration takes several seconds)
3. call `s.zero()` once
4. call `s.read()` three times

Write the three values returned by those `s.read()` calls to `/home/agent/work/readings.txt`, one number per line, in the order they were returned. Do not modify `sensor.py` or `sensor.seed`.
