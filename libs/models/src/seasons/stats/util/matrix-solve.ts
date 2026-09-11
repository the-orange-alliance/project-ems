import { Matrix, SingularValueDecomposition } from 'ml-matrix';
export function leastSquares(
  a: number[][],
  b: number[],
  lambda = 0,
  prior = 0
) {
  if (!a.length || !a[0].length || a.length !== b.length)
    throw new Error('Insufficient matrix observations');
  const n = a[0].length;
  if (
    !a.every((r) => r.length === n && r.every(Number.isFinite)) ||
    !b.every(Number.isFinite)
  )
    throw new Error('Invalid matrix');
  const rows = a.map((r) => [...r]),
    target = [...b];
  if (lambda > 0)
    for (let i = 0; i < n; i++) {
      rows.push(
        Array.from({ length: n }, (_, j) => (i === j ? Math.sqrt(lambda) : 0))
      );
      target.push(Math.sqrt(lambda) * prior);
    }
  const svd = new SingularValueDecomposition(new Matrix(rows), {
    autoTranspose: true
  });
  return {
    values: svd.solve(Matrix.columnVector(target)).to1DArray(),
    rank: svd.rank,
    columns: n,
    underdetermined: svd.rank < n
  };
}
