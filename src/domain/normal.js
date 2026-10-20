function N(x) {
  const a = Math.abs(x);
  let c;
  if (a > 37) {
    c = 0;
  } else {
    const e = Math.exp((-a * a) / 2);
    let b;
    if (a < 7.07106781186547) {
      b = 3.52624965998911e-2 * a + 0.700383064443688;
      b = b * a + 6.37396220353165;
      b = b * a + 33.912866078383;
      b = b * a + 112.079291497871;
      b = b * a + 221.213596169931;
      b = b * a + 220.206867912376;
      c = e * b;
      b = 8.83883476483184e-2 * a + 1.75566716318264;
      b = b * a + 16.064177579207;
      b = b * a + 86.7807322029461;
      b = b * a + 296.564248779674;
      b = b * a + 637.333633378831;
      b = b * a + 793.826512519948;
      b = b * a + 440.413735824752;
      c = c / b;
    } else {
      b = a + 0.65;
      b = a + 4 / b;
      b = a + 3 / b;
      b = a + 2 / b;
      b = a + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}
function n_pdf(x) {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}
function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
function normals(seed, n) {
  const r = rng(seed),
    a = [];
  while (a.length < n) {
    const u = Math.max(r(), 1e-12),
      v = r(),
      m = Math.sqrt(-2 * Math.log(u));
    a.push(m * Math.cos(2 * Math.PI * v));
    if (a.length < n) a.push(m * Math.sin(2 * Math.PI * v));
  }
  return a;
}
function confidenceZ(level) {
  return level === 0.8
    ? 1.281551566
    : level === 0.9
      ? 1.644853627
      : level === 0.99
        ? 2.575829304
        : 1.959963985;
}
export { N, n_pdf, rng, normals, confidenceZ };
