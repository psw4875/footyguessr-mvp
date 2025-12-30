process.env.PORT = process.env.PORT || '4001';
import('./index.js').catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
