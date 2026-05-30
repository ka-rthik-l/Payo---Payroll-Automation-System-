export function getOperator(req) {
  return req.headers['x-operator-name'] || 'system';
}
