=
   VedicAladdin V6 — assets/js/router.js
   Simple hash-based SPA router
   ============================================================ */
const ROUTER = (function () {
  'use strict';

  const routes = {};
  let currentRoute = null;

  function register(path, handler) { routes[path] = handler; }

  function navigate(path) {
    window.location.hash = path;
    dispatch(path);
  }

  function dispatch(path) {
    const handler = routes[path] || routes['*'];
    if (handler) { currentRoute = path; handler(path); }
  }

  function init() {
    window.addEventListener('hashchange', () => {
      const path = window.location.hash.replace('#','') || '/';
      dispatch(path);
    });
    // Initial
    dispatch(window.location.hash.replace('#','') || '/');
  }

  function getCurrent() { return currentRoute; }

  if (typeof window !== 'undefined') window.ROUTER = { register, navigate, dispatch, init, getCurrent };
  return { register, navigate, dispatch, init, getCurrent };
})();
