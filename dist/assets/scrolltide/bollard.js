var zs = { exports: {} }, su = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var ah;
function E1() {
  if (ah) return su;
  ah = 1;
  var b = Symbol.for("react.transitional.element"), O = Symbol.for("react.fragment");
  function N(s, x, k) {
    var nt = null;
    if (k !== void 0 && (nt = "" + k), x.key !== void 0 && (nt = "" + x.key), "key" in x) {
      k = {};
      for (var Nt in x)
        Nt !== "key" && (k[Nt] = x[Nt]);
    } else k = x;
    return x = k.ref, {
      $$typeof: b,
      type: s,
      key: nt,
      ref: x !== void 0 ? x : null,
      props: k
    };
  }
  return su.Fragment = O, su.jsx = N, su.jsxs = N, su;
}
var nh;
function _1() {
  return nh || (nh = 1, zs.exports = E1()), zs.exports;
}
var T = _1(), Ns = { exports: {} }, $ = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var uh;
function z1() {
  if (uh) return $;
  uh = 1;
  var b = Symbol.for("react.transitional.element"), O = Symbol.for("react.portal"), N = Symbol.for("react.fragment"), s = Symbol.for("react.strict_mode"), x = Symbol.for("react.profiler"), k = Symbol.for("react.consumer"), nt = Symbol.for("react.context"), Nt = Symbol.for("react.forward_ref"), lt = Symbol.for("react.suspense"), pt = Symbol.for("react.memo"), q = Symbol.for("react.lazy"), p = Symbol.for("react.activity"), Y = Symbol.for("react.view_transition"), Ut = Symbol.iterator;
  function jt(r) {
    return r === null || typeof r != "object" ? null : (r = Ut && r[Ut] || r["@@iterator"], typeof r == "function" ? r : null);
  }
  var Ot = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, F = Object.assign, Tt = {};
  function At(r, S, A) {
    this.props = r, this.context = S, this.refs = Tt, this.updater = A || Ot;
  }
  At.prototype.isReactComponent = {}, At.prototype.setState = function(r, S) {
    if (typeof r != "object" && typeof r != "function" && r != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, r, S, "setState");
  }, At.prototype.forceUpdate = function(r) {
    this.updater.enqueueForceUpdate(this, r, "forceUpdate");
  };
  function ul() {
  }
  ul.prototype = At.prototype;
  function bt(r, S, A) {
    this.props = r, this.context = S, this.refs = Tt, this.updater = A || Ot;
  }
  var I = bt.prototype = new ul();
  I.constructor = bt, F(I, At.prototype), I.isPureReactComponent = !0;
  var ut = Array.isArray;
  function G() {
  }
  var W = { H: null, A: null, T: null, S: null }, Pt = Object.prototype.hasOwnProperty;
  function Bt(r, S, A) {
    var U = A.ref;
    return {
      $$typeof: b,
      type: r,
      key: S,
      ref: U !== void 0 ? U : null,
      props: A
    };
  }
  function dt(r, S) {
    return Bt(r.type, S, r.props);
  }
  function Ct(r) {
    return typeof r == "object" && r !== null && r.$$typeof === b;
  }
  function Qt(r) {
    var S = { "=": "=0", ":": "=2" };
    return "$" + r.replace(/[=:]/g, function(A) {
      return S[A];
    });
  }
  var ht = /\/+/g;
  function Mt(r, S) {
    return typeof r == "object" && r !== null && r.key != null ? Qt("" + r.key) : S.toString(36);
  }
  function M(r) {
    switch (r.status) {
      case "fulfilled":
        return r.value;
      case "rejected":
        throw r.reason;
      default:
        switch (typeof r.status == "string" ? r.then(G, G) : (r.status = "pending", r.then(
          function(S) {
            r.status === "pending" && (r.status = "fulfilled", r.value = S);
          },
          function(S) {
            r.status === "pending" && (r.status = "rejected", r.reason = S);
          }
        )), r.status) {
          case "fulfilled":
            return r.value;
          case "rejected":
            throw r.reason;
        }
    }
    throw r;
  }
  function R(r, S, A, U, j) {
    var J = typeof r;
    (J === "undefined" || J === "boolean") && (r = null);
    var K = !1;
    if (r === null) K = !0;
    else
      switch (J) {
        case "bigint":
        case "string":
        case "number":
          K = !0;
          break;
        case "object":
          switch (r.$$typeof) {
            case b:
            case O:
              K = !0;
              break;
            case q:
              return K = r._init, R(
                K(r._payload),
                S,
                A,
                U,
                j
              );
          }
      }
    if (K)
      return j = j(r), K = U === "" ? "." + Mt(r, 0) : U, ut(j) ? (A = "", K != null && (A = K.replace(ht, "$&/") + "/"), R(j, S, A, "", function(Q) {
        return Q;
      })) : j != null && (Ct(j) && (j = dt(
        j,
        A + (j.key == null || r && r.key === j.key ? "" : ("" + j.key).replace(
          ht,
          "$&/"
        ) + "/") + K
      )), S.push(j)), 1;
    K = 0;
    var C = U === "" ? "." : U + ":";
    if (ut(r))
      for (var z = 0; z < r.length; z++)
        U = r[z], J = C + Mt(U, z), K += R(
          U,
          S,
          A,
          J,
          j
        );
    else if (z = jt(r), typeof z == "function")
      for (r = z.call(r), z = 0; !(U = r.next()).done; )
        U = U.value, J = C + Mt(U, z++), K += R(
          U,
          S,
          A,
          J,
          j
        );
    else if (J === "object") {
      if (typeof r.then == "function")
        return R(
          M(r),
          S,
          A,
          U,
          j
        );
      throw S = String(r), Error(
        "Objects are not valid as a React child (found: " + (S === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : S) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return K;
  }
  function X(r, S, A) {
    if (r == null) return r;
    var U = [], j = 0;
    return R(r, U, "", "", function(J) {
      return S.call(A, J, j++);
    }), U;
  }
  function w(r) {
    if (r._status === -1) {
      var S = r._result, A = S();
      A.then(
        function(U) {
          (r._status === 0 || r._status === -1) && (r._status = 1, r._result = U, A.status === void 0 && (A.status = "fulfilled", A.value = U));
        },
        function(U) {
          (r._status === 0 || r._status === -1) && (r._status = 2, r._result = U, A.status === void 0 && (A.status = "rejected", A.reason = U));
        }
      ), r._status === -1 && (r._status = 0, r._result = A);
    }
    if (r._status === 1) return r._result.default;
    throw r._result;
  }
  var V = typeof reportError == "function" ? reportError : function(r) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var S = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof r == "object" && r !== null && typeof r.message == "string" ? String(r.message) : String(r),
        error: r
      });
      if (!window.dispatchEvent(S)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", r);
      return;
    }
    console.error(r);
  };
  function Et(r) {
    var S = W.T, A = {};
    A.types = S !== null ? S.types : null, W.T = A;
    try {
      var U = r(), j = W.S;
      j !== null && j(A, U), typeof U == "object" && U !== null && typeof U.then == "function" && U.then(G, V);
    } catch (J) {
      V(J);
    } finally {
      S !== null && A.types !== null && (S.types = A.types), W.T = S;
    }
  }
  function Wt(r) {
    var S = W.T;
    if (S !== null) {
      var A = S.types;
      A === null ? S.types = [r] : A.indexOf(r) === -1 && A.push(r);
    } else Et(Wt.bind(null, r));
  }
  var Zt = {
    map: X,
    forEach: function(r, S, A) {
      X(
        r,
        function() {
          S.apply(this, arguments);
        },
        A
      );
    },
    count: function(r) {
      var S = 0;
      return X(r, function() {
        S++;
      }), S;
    },
    toArray: function(r) {
      return X(r, function(S) {
        return S;
      }) || [];
    },
    only: function(r) {
      if (!Ct(r))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return r;
    }
  };
  return $.Activity = p, $.Children = Zt, $.Component = At, $.Fragment = N, $.Profiler = x, $.PureComponent = bt, $.StrictMode = s, $.Suspense = lt, $.ViewTransition = Y, $.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = W, $.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(r) {
      return W.H.useMemoCache(r);
    }
  }, $.addTransitionType = Wt, $.cache = function(r) {
    return function() {
      return r.apply(null, arguments);
    };
  }, $.cacheSignal = function() {
    return null;
  }, $.cloneElement = function(r, S, A) {
    if (r == null)
      throw Error(
        "The argument must be a React element, but you passed " + r + "."
      );
    var U = F({}, r.props), j = r.key;
    if (S != null)
      for (J in S.key !== void 0 && (j = "" + S.key), S)
        !Pt.call(S, J) || J === "key" || J === "__self" || J === "__source" || J === "ref" && S.ref === void 0 || (U[J] = S[J]);
    var J = arguments.length - 2;
    if (J === 1) U.children = A;
    else if (1 < J) {
      for (var K = Array(J), C = 0; C < J; C++)
        K[C] = arguments[C + 2];
      U.children = K;
    }
    return Bt(r.type, j, U);
  }, $.createContext = function(r) {
    return r = {
      $$typeof: nt,
      _currentValue: r,
      _currentValue2: r,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, r.Provider = r, r.Consumer = {
      $$typeof: k,
      _context: r
    }, r;
  }, $.createElement = function(r, S, A) {
    var U, j = {}, J = null;
    if (S != null)
      for (U in S.key !== void 0 && (J = "" + S.key), S)
        Pt.call(S, U) && U !== "key" && U !== "__self" && U !== "__source" && (j[U] = S[U]);
    var K = arguments.length - 2;
    if (K === 1) j.children = A;
    else if (1 < K) {
      for (var C = Array(K), z = 0; z < K; z++)
        C[z] = arguments[z + 2];
      j.children = C;
    }
    if (r && r.defaultProps)
      for (U in K = r.defaultProps, K)
        j[U] === void 0 && (j[U] = K[U]);
    return Bt(r, J, j);
  }, $.createRef = function() {
    return { current: null };
  }, $.forwardRef = function(r) {
    return { $$typeof: Nt, render: r };
  }, $.isValidElement = Ct, $.lazy = function(r) {
    return {
      $$typeof: q,
      _payload: { _status: -1, _result: r },
      _init: w
    };
  }, $.memo = function(r, S) {
    return {
      $$typeof: pt,
      type: r,
      compare: S === void 0 ? null : S
    };
  }, $.startTransition = Et, $.unstable_useCacheRefresh = function() {
    return W.H.useCacheRefresh();
  }, $.use = function(r) {
    return W.H.use(r);
  }, $.useActionState = function(r, S, A) {
    return W.H.useActionState(r, S, A);
  }, $.useCallback = function(r, S) {
    return W.H.useCallback(r, S);
  }, $.useContext = function(r) {
    return W.H.useContext(r);
  }, $.useDebugValue = function() {
  }, $.useDeferredValue = function(r, S) {
    return W.H.useDeferredValue(r, S);
  }, $.useEffect = function(r, S) {
    return W.H.useEffect(r, S);
  }, $.useEffectEvent = function(r) {
    return W.H.useEffectEvent(r);
  }, $.useId = function() {
    return W.H.useId();
  }, $.useImperativeHandle = function(r, S, A) {
    return W.H.useImperativeHandle(r, S, A);
  }, $.useInsertionEffect = function(r, S) {
    return W.H.useInsertionEffect(r, S);
  }, $.useLayoutEffect = function(r, S) {
    return W.H.useLayoutEffect(r, S);
  }, $.useMemo = function(r, S) {
    return W.H.useMemo(r, S);
  }, $.useOptimistic = function(r, S) {
    return W.H.useOptimistic(r, S);
  }, $.useReducer = function(r, S, A) {
    return W.H.useReducer(r, S, A);
  }, $.useRef = function(r) {
    return W.H.useRef(r);
  }, $.useState = function(r) {
    return W.H.useState(r);
  }, $.useSyncExternalStore = function(r, S, A) {
    return W.H.useSyncExternalStore(
      r,
      S,
      A
    );
  }, $.useTransition = function() {
    return W.H.useTransition();
  }, $.version = "19.3.1", $;
}
var ih;
function Rs() {
  return ih || (ih = 1, Ns.exports = z1()), Ns.exports;
}
var at = Rs(), Os = { exports: {} }, ou = {}, As = { exports: {} }, Ms = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var ch;
function N1() {
  return ch || (ch = 1, (function(b) {
    function O(M, R) {
      var X = M.length;
      M.push(R);
      t: for (; 0 < X; ) {
        var w = X - 1 >>> 1, V = M[w];
        if (0 < x(V, R))
          M[w] = R, M[X] = V, X = w;
        else break t;
      }
    }
    function N(M) {
      return M.length === 0 ? null : M[0];
    }
    function s(M) {
      if (M.length === 0) return null;
      var R = M[0], X = M.pop();
      if (X !== R) {
        M[0] = X;
        t: for (var w = 0, V = M.length, Et = V >>> 1; w < Et; ) {
          var Wt = 2 * (w + 1) - 1, Zt = M[Wt], r = Wt + 1, S = M[r];
          if (0 > x(Zt, X))
            r < V && 0 > x(S, Zt) ? (M[w] = S, M[r] = X, w = r) : (M[w] = Zt, M[Wt] = X, w = Wt);
          else if (r < V && 0 > x(S, X))
            M[w] = S, M[r] = X, w = r;
          else break t;
        }
      }
      return R;
    }
    function x(M, R) {
      var X = M.sortIndex - R.sortIndex;
      return X !== 0 ? X : M.id - R.id;
    }
    if (b.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var k = performance;
      b.unstable_now = function() {
        return k.now();
      };
    } else {
      var nt = Date, Nt = nt.now();
      b.unstable_now = function() {
        return nt.now() - Nt;
      };
    }
    var lt = [], pt = [], q = 1, p = null, Y = 3, Ut = !1, jt = !1, Ot = !1, F = !1, Tt = typeof setTimeout == "function" ? setTimeout : null, At = typeof clearTimeout == "function" ? clearTimeout : null, ul = typeof setImmediate < "u" ? setImmediate : null;
    function bt(M) {
      for (var R = N(pt); R !== null; ) {
        if (R.callback === null) s(pt);
        else if (R.startTime <= M)
          s(pt), R.sortIndex = R.expirationTime, O(lt, R);
        else break;
        R = N(pt);
      }
    }
    function I(M) {
      if (Ot = !1, bt(M), !jt)
        if (N(lt) !== null)
          jt = !0, ut || (ut = !0, Ct());
        else {
          var R = N(pt);
          R !== null && Mt(I, R.startTime - M);
        }
    }
    var ut = !1, G = -1, W = 5, Pt = -1;
    function Bt() {
      return F ? !0 : !(b.unstable_now() - Pt < W);
    }
    function dt() {
      if (F = !1, ut) {
        var M = b.unstable_now();
        Pt = M;
        var R = !0;
        try {
          t: {
            jt = !1, Ot && (Ot = !1, At(G), G = -1), Ut = !0;
            var X = Y;
            try {
              l: {
                for (bt(M), p = N(lt); p !== null && !(p.expirationTime > M && Bt()); ) {
                  var w = p.callback;
                  if (typeof w == "function") {
                    p.callback = null, Y = p.priorityLevel;
                    var V = w(
                      p.expirationTime <= M
                    );
                    if (M = b.unstable_now(), typeof V == "function") {
                      p.callback = V, bt(M), R = !0;
                      break l;
                    }
                    p === N(lt) && s(lt), bt(M);
                  } else s(lt);
                  p = N(lt);
                }
                if (p !== null) R = !0;
                else {
                  var Et = N(pt);
                  Et !== null && Mt(
                    I,
                    Et.startTime - M
                  ), R = !1;
                }
              }
              break t;
            } finally {
              p = null, Y = X, Ut = !1;
            }
            R = void 0;
          }
        } finally {
          R ? Ct() : ut = !1;
        }
      }
    }
    var Ct;
    if (typeof ul == "function")
      Ct = function() {
        ul(dt);
      };
    else if (typeof MessageChannel < "u") {
      var Qt = new MessageChannel(), ht = Qt.port2;
      Qt.port1.onmessage = dt, Ct = function() {
        ht.postMessage(null);
      };
    } else
      Ct = function() {
        Tt(dt, 0);
      };
    function Mt(M, R) {
      G = Tt(function() {
        M(b.unstable_now());
      }, R);
    }
    b.unstable_IdlePriority = 5, b.unstable_ImmediatePriority = 1, b.unstable_LowPriority = 4, b.unstable_NormalPriority = 3, b.unstable_Profiling = null, b.unstable_UserBlockingPriority = 2, b.unstable_cancelCallback = function(M) {
      M.callback = null;
    }, b.unstable_forceFrameRate = function(M) {
      0 > M || 125 < M ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : W = 0 < M ? Math.floor(1e3 / M) : 5;
    }, b.unstable_getCurrentPriorityLevel = function() {
      return Y;
    }, b.unstable_next = function(M) {
      switch (Y) {
        case 1:
        case 2:
        case 3:
          var R = 3;
          break;
        default:
          R = Y;
      }
      var X = Y;
      Y = R;
      try {
        return M();
      } finally {
        Y = X;
      }
    }, b.unstable_requestPaint = function() {
      F = !0;
    }, b.unstable_runWithPriority = function(M, R) {
      switch (M) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          M = 3;
      }
      var X = Y;
      Y = M;
      try {
        return R();
      } finally {
        Y = X;
      }
    }, b.unstable_scheduleCallback = function(M, R, X) {
      var w = b.unstable_now();
      switch (typeof X == "object" && X !== null ? (X = X.delay, X = typeof X == "number" && 0 < X ? w + X : w) : X = w, M) {
        case 1:
          var V = -1;
          break;
        case 2:
          V = 250;
          break;
        case 5:
          V = 1073741823;
          break;
        case 4:
          V = 1e4;
          break;
        default:
          V = 5e3;
      }
      return V = X + V, M = {
        id: q++,
        callback: R,
        priorityLevel: M,
        startTime: X,
        expirationTime: V,
        sortIndex: -1
      }, X > w ? (M.sortIndex = X, O(pt, M), N(lt) === null && M === N(pt) && (Ot ? (At(G), G = -1) : Ot = !0, Mt(I, X - w))) : (M.sortIndex = V, O(lt, M), jt || Ut || (jt = !0, ut || (ut = !0, Ct()))), M;
    }, b.unstable_shouldYield = Bt, b.unstable_wrapCallback = function(M) {
      var R = Y;
      return function() {
        var X = Y;
        Y = R;
        try {
          return M.apply(this, arguments);
        } finally {
          Y = X;
        }
      };
    };
  })(Ms)), Ms;
}
var fh;
function O1() {
  return fh || (fh = 1, As.exports = N1()), As.exports;
}
var xs = { exports: {} }, dl = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var sh;
function A1() {
  if (sh) return dl;
  sh = 1;
  var b = Rs();
  function O(q) {
    var p = "https://react.dev/errors/" + q;
    if (1 < arguments.length) {
      p += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var Y = 2; Y < arguments.length; Y++)
        p += "&args[]=" + encodeURIComponent(arguments[Y]);
    }
    return "Minified React error #" + q + "; visit " + p + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function N() {
  }
  var s = {
    d: {
      f: N,
      r: function() {
        throw Error(O(522));
      },
      D: N,
      C: N,
      L: N,
      m: N,
      X: N,
      S: N,
      M: N
    },
    p: 0,
    findDOMNode: null
  }, x = Symbol.for("react.portal"), k = Symbol.for("react.recoverable"), nt = Symbol.for("react.optimistic_key");
  function Nt(q, p, Y) {
    var Ut = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: x,
      key: Ut == null ? null : Ut === nt ? nt : "" + Ut,
      children: q,
      containerInfo: p,
      implementation: Y
    };
  }
  var lt = b.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function pt(q, p) {
    if (q === "font") return "";
    if (typeof p == "string")
      return p === "use-credentials" ? p : "";
  }
  return dl.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = s, dl.browser = function(q) {
    return { $$typeof: k, _reason: q };
  }, dl.createPortal = function(q, p) {
    var Y = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!p || p.nodeType !== 1 && p.nodeType !== 9 && p.nodeType !== 11)
      throw Error(O(299));
    return Nt(q, p, null, Y);
  }, dl.flushSync = function(q) {
    var p = lt.T, Y = s.p;
    try {
      if (lt.T = null, s.p = 2, q) return q();
    } finally {
      lt.T = p, s.p = Y, s.d.f();
    }
  }, dl.preconnect = function(q, p) {
    typeof q == "string" && (p ? (p = p.crossOrigin, p = typeof p == "string" ? p === "use-credentials" ? p : "" : void 0) : p = null, s.d.C(q, p));
  }, dl.prefetchDNS = function(q) {
    typeof q == "string" && s.d.D(q);
  }, dl.preinit = function(q, p) {
    if (typeof q == "string" && p && typeof p.as == "string") {
      var Y = p.as, Ut = pt(Y, p.crossOrigin), jt = typeof p.integrity == "string" ? p.integrity : void 0, Ot = typeof p.fetchPriority == "string" ? p.fetchPriority : void 0;
      Y === "style" ? s.d.S(
        q,
        typeof p.precedence == "string" ? p.precedence : void 0,
        {
          crossOrigin: Ut,
          integrity: jt,
          fetchPriority: Ot
        }
      ) : Y === "script" && s.d.X(q, {
        crossOrigin: Ut,
        integrity: jt,
        fetchPriority: Ot,
        nonce: typeof p.nonce == "string" ? p.nonce : void 0
      });
    }
  }, dl.preinitModule = function(q, p) {
    if (typeof q == "string")
      if (typeof p == "object" && p !== null) {
        if (p.as == null || p.as === "script") {
          var Y = pt(
            p.as,
            p.crossOrigin
          );
          s.d.M(q, {
            crossOrigin: Y,
            integrity: typeof p.integrity == "string" ? p.integrity : void 0,
            nonce: typeof p.nonce == "string" ? p.nonce : void 0,
            fetchPriority: typeof p.fetchPriority == "string" ? p.fetchPriority : void 0
          });
        }
      } else p == null && s.d.M(q);
  }, dl.preload = function(q, p) {
    if (typeof q == "string" && typeof p == "object" && p !== null && typeof p.as == "string") {
      var Y = p.as, Ut = pt(Y, p.crossOrigin);
      s.d.L(q, Y, {
        crossOrigin: Ut,
        integrity: typeof p.integrity == "string" ? p.integrity : void 0,
        nonce: typeof p.nonce == "string" ? p.nonce : void 0,
        type: typeof p.type == "string" ? p.type : void 0,
        fetchPriority: typeof p.fetchPriority == "string" ? p.fetchPriority : void 0,
        referrerPolicy: typeof p.referrerPolicy == "string" ? p.referrerPolicy : void 0,
        imageSrcSet: typeof p.imageSrcSet == "string" ? p.imageSrcSet : void 0,
        imageSizes: typeof p.imageSizes == "string" ? p.imageSizes : void 0,
        media: typeof p.media == "string" ? p.media : void 0
      });
    }
  }, dl.preloadModule = function(q, p) {
    if (typeof q == "string")
      if (p) {
        var Y = pt(p.as, p.crossOrigin);
        s.d.m(q, {
          as: typeof p.as == "string" && p.as !== "script" ? p.as : void 0,
          crossOrigin: Y,
          integrity: typeof p.integrity == "string" ? p.integrity : void 0,
          nonce: typeof p.nonce == "string" ? p.nonce : void 0,
          fetchPriority: typeof p.fetchPriority == "string" ? p.fetchPriority : void 0
        });
      } else s.d.m(q);
  }, dl.requestFormReset = function(q) {
    s.d.r(q);
  }, dl.unstable_batchedUpdates = function(q, p) {
    return q(p);
  }, dl.useFormState = function(q, p, Y) {
    return lt.H.useFormState(q, p, Y);
  }, dl.useFormStatus = function() {
    return lt.H.useHostTransitionStatus();
  }, dl.version = "19.3.1", dl;
}
var oh;
function M1() {
  if (oh) return xs.exports;
  oh = 1;
  function b() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(b);
      } catch (O) {
        console.error(O);
      }
  }
  return b(), xs.exports = A1(), xs.exports;
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var rh;
function x1() {
  if (rh) return ou;
  rh = 1;
  var b = O1(), O = Rs(), N = M1();
  function s(t) {
    var l = "https://react.dev/errors/" + t;
    if (1 < arguments.length) {
      l += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var e = 2; e < arguments.length; e++)
        l += "&args[]=" + encodeURIComponent(arguments[e]);
    }
    return "Minified React error #" + t + "; visit " + l + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function x(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function k(t) {
    for (var l = t, e = l; e && !e.alternate; )
      l = e, (l.flags & 4098) !== 0 && (t = l.return), e = l.return;
    for (; l.return; ) l = l.return;
    return l.tag === 3 ? t : null;
  }
  function nt(t) {
    if (t.tag === 13) {
      var l = t.memoizedState;
      if (l === null && (t = t.alternate, t !== null && (l = t.memoizedState)), l !== null) return l.dehydrated;
    }
    return null;
  }
  function Nt(t) {
    if (t.tag === 31) {
      var l = t.memoizedState;
      if (l === null && (t = t.alternate, t !== null && (l = t.memoizedState)), l !== null) return l.dehydrated;
    }
    return null;
  }
  function lt(t) {
    if (k(t) !== t)
      throw Error(s(188));
  }
  function pt(t) {
    var l = t.alternate;
    if (!l) {
      if (l = k(t), l === null) throw Error(s(188));
      return l !== t ? null : t;
    }
    for (var e = t, a = l; ; ) {
      var n = e.return;
      if (n === null) break;
      var u = n.alternate;
      if (u === null) {
        if (a = n.return, a !== null) {
          e = a;
          continue;
        }
        break;
      }
      if (n.child === u.child) {
        for (u = n.child; u; ) {
          if (u === e) return lt(n), t;
          if (u === a) return lt(n), l;
          u = u.sibling;
        }
        throw Error(s(188));
      }
      if (e.return !== a.return) e = n, a = u;
      else {
        for (var i = !1, c = n.child; c; ) {
          if (c === e) {
            i = !0, e = n, a = u;
            break;
          }
          if (c === a) {
            i = !0, a = n, e = u;
            break;
          }
          c = c.sibling;
        }
        if (!i) {
          for (c = u.child; c; ) {
            if (c === e) {
              i = !0, e = u, a = n;
              break;
            }
            if (c === a) {
              i = !0, a = u, e = n;
              break;
            }
            c = c.sibling;
          }
          if (!i) throw Error(s(189));
        }
      }
      if (e.alternate !== a) throw Error(s(190));
    }
    if (e.tag !== 3) throw Error(s(188));
    return e.stateNode.current === e ? t : l;
  }
  function q(t) {
    var l = t.tag;
    if (l === 5 || l === 26 || l === 27 || l === 6) return t;
    for (t = t.child; t !== null; ) {
      if (l = q(t), l !== null) return l;
      t = t.sibling;
    }
    return null;
  }
  function p(t, l, e, a, n, u) {
    for (; t !== null; ) {
      if ((t.tag === 5 || t.tag === 27 || t.tag === 6) && e(t, a, n, u) || (t.tag !== 22 || t.memoizedState === null) && (l || t.tag !== 5 && t.tag !== 27) && p(
        t.child,
        l,
        e,
        a,
        n,
        u
      ))
        return !0;
      t = t.sibling;
    }
    return !1;
  }
  function Y(t) {
    for (t = t.return; t !== null; ) {
      if (t.tag === 3 || t.tag === 5 || t.tag === 27) return t;
      t = t.return;
    }
    return null;
  }
  function Ut(t) {
    var l = !1;
    for (t = t.return; t !== null && (t.tag === 4 && (l = !0), !(t.tag === 3 || t.tag === 5 || t.tag === 27)); )
      t = t.return;
    return l;
  }
  function jt(t) {
    var l = [null, null], e = Y(t);
    return e === null || Ot(
      l,
      t,
      e.child,
      { foundSelf: !1 }
    ), l;
  }
  function Ot(t, l, e, a) {
    for (; e !== null; ) {
      if (e === l) a.foundSelf = !0;
      else if (e.tag === 5 || e.tag === 27 || e.tag === 6) {
        if (a.foundSelf) return t[1] = e, !0;
        t[0] = e;
      } else if ((e.tag !== 22 || e.memoizedState === null) && Ot(
        t,
        l,
        e.child,
        a
      ))
        return !0;
      e = e.sibling;
    }
    return !1;
  }
  function F(t) {
    switch (t.tag) {
      case 5:
      case 27:
      case 6:
        return t.stateNode;
      case 3:
        return t.stateNode.containerInfo;
      default:
        throw Error(s(559));
    }
  }
  var Tt = null, At = null;
  function ul(t, l, e) {
    return t === e ? !0 : t === l ? (Tt = t, !0) : !1;
  }
  function bt(t, l, e) {
    return t === e ? (At = t, !1) : t === l ? (At !== null && (Tt = t), !0) : !1;
  }
  function I(t) {
    if (t === null) return null;
    do
      t = t === null ? null : t.return;
    while (t && t.tag !== 5 && t.tag !== 27 && t.tag !== 3);
    return t || null;
  }
  function ut(t, l, e) {
    for (var a = 0, n = t; n; n = e(n)) a++;
    n = 0;
    for (var u = l; u; u = e(u)) n++;
    for (; 0 < a - n; ) t = e(t), a--;
    for (; 0 < n - a; ) l = e(l), n--;
    for (; a--; ) {
      if (t === l || l !== null && t === l.alternate)
        return t;
      t = e(t), l = e(l);
    }
    return null;
  }
  var G = Object.assign, W = Symbol.for("react.element"), Pt = Symbol.for("react.transitional.element"), Bt = Symbol.for("react.portal"), dt = Symbol.for("react.fragment"), Ct = Symbol.for("react.strict_mode"), Qt = Symbol.for("react.profiler"), ht = Symbol.for("react.consumer"), Mt = Symbol.for("react.context"), M = Symbol.for("react.forward_ref"), R = Symbol.for("react.suspense"), X = Symbol.for("react.suspense_list"), w = Symbol.for("react.memo"), V = Symbol.for("react.lazy"), Et = Symbol.for("react.activity"), Wt = Symbol.for("react.legacy_hidden"), Zt = Symbol.for("react.memo_cache_sentinel"), r = Symbol.for("react.view_transition"), S = Symbol.for("react.recoverable"), A = Symbol.iterator;
  function U(t) {
    return t === null || typeof t != "object" ? null : (t = A && t[A] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var j = Symbol.for("react.client.reference");
  function J(t) {
    if (t == null) return null;
    if (typeof t == "function")
      return t.$$typeof === j ? null : t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case dt:
        return "Fragment";
      case Qt:
        return "Profiler";
      case Ct:
        return "StrictMode";
      case R:
        return "Suspense";
      case X:
        return "SuspenseList";
      case Et:
        return "Activity";
      case r:
        return "ViewTransition";
    }
    if (typeof t == "object")
      switch (t.$$typeof) {
        case Bt:
          return "Portal";
        case Mt:
          return t.displayName || "Context";
        case ht:
          return (t._context.displayName || "Context") + ".Consumer";
        case M:
          var l = t.render;
          return t = t.displayName, t || (t = l.displayName || l.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
        case w:
          return l = t.displayName || null, l !== null ? l : J(t.type) || "Memo";
        case V:
          l = t._payload, t = t._init;
          try {
            return J(t(l));
          } catch {
          }
      }
    return null;
  }
  var K = Array.isArray, C = O.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, z = N.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Q = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, mt = [], vt = -1;
  function st(t) {
    return { current: t };
  }
  function it(t) {
    0 > vt || (t.current = mt[vt], mt[vt] = null, vt--);
  }
  function gt(t, l) {
    vt++, mt[vt] = t.current, t.current = l;
  }
  var vl = st(null), mn = st(null), Ne = st(null), du = st(null);
  function hu(t, l) {
    switch (gt(Ne, l), gt(mn, t), gt(vl, null), l.nodeType) {
      case 9:
      case 11:
        t = (t = l.documentElement) && (t = t.namespaceURI) ? dd(t) : 0;
        break;
      default:
        if (t = l.tagName, l = l.namespaceURI)
          l = dd(l), t = hd(l, t);
        else
          switch (t) {
            case "svg":
              t = 1;
              break;
            case "math":
              t = 2;
              break;
            default:
              t = 0;
          }
    }
    it(vl), gt(vl, t);
  }
  function _a() {
    it(vl), it(mn), it(Ne);
  }
  function Zi(t) {
    var l = t.memoizedState;
    l !== null && (rn._currentValue = l.memoizedState, gt(du, t)), l = vl.current;
    var e = hd(l, t.type);
    l !== e && (gt(mn, t), gt(vl, e));
  }
  function vu(t) {
    mn.current === t && (it(vl), it(mn)), du.current === t && (it(du), rn._currentValue = Q);
  }
  var Vi, Us;
  function Oe(t) {
    if (Vi === void 0)
      try {
        throw Error();
      } catch (e) {
        var l = e.stack.trim().match(/\n( *(at )?)/);
        Vi = l && l[1] || "", Us = -1 < e.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Vi + t + Us;
  }
  var Li = !1;
  function Ki(t, l) {
    if (!t || Li) return "";
    Li = !0;
    var e = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var a = {
        DetermineComponentFrameRoot: function() {
          try {
            if (l) {
              var _ = function() {
                throw Error();
              };
              if (Object.defineProperty(_.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(_, []);
                } catch (D) {
                  var d = D;
                }
                Reflect.construct(t, [], _);
              } else {
                try {
                  _.call();
                } catch (D) {
                  d = D;
                }
                _ = !1;
                try {
                  var g = Object.getOwnPropertyDescriptor(
                    t.prototype,
                    "props"
                  );
                  Object.defineProperty(t.prototype, "props", {
                    configurable: !0,
                    set: function() {
                      throw Error();
                    }
                  }), _ = !0, new t();
                } finally {
                  _ && (g !== void 0 ? Object.defineProperty(t.prototype, "props", g) : delete t.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (D) {
                d = D;
              }
              (_ = t()) && typeof _.catch == "function" && _.catch(function() {
              });
            }
          } catch (D) {
            if (D && d && typeof D.stack == "string")
              return [D.stack, d.stack];
          }
          return [null, null];
        }
      };
      a.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var n = Object.getOwnPropertyDescriptor(
        a.DetermineComponentFrameRoot,
        "name"
      );
      n && n.configurable && Object.defineProperty(
        a.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var u = a.DetermineComponentFrameRoot(), i = u[0], c = u[1];
      if (i && c) {
        var f = i.split(`
`), v = c.split(`
`);
        for (n = a = 0; a < f.length && !f[a].includes("DetermineComponentFrameRoot"); )
          a++;
        for (; n < v.length && !v[n].includes(
          "DetermineComponentFrameRoot"
        ); )
          n++;
        if (a === f.length || n === v.length)
          for (a = f.length - 1, n = v.length - 1; 1 <= a && 0 <= n && f[a] !== v[n]; )
            n--;
        for (; 1 <= a && 0 <= n; a--, n--)
          if (f[a] !== v[n]) {
            if (a !== 1 || n !== 1)
              do
                if (a--, n--, 0 > n || f[a] !== v[n]) {
                  var y = `
` + f[a].replace(" at new ", " at ");
                  return t.displayName && y.includes("<anonymous>") && (y = y.replace("<anonymous>", t.displayName)), y;
                }
              while (1 <= a && 0 <= n);
            break;
          }
      }
    } finally {
      Li = !1, Error.prepareStackTrace = e;
    }
    return (e = t ? t.displayName || t.name : "") ? Oe(e) : "";
  }
  function Oh(t, l) {
    switch (t.tag) {
      case 26:
      case 27:
      case 5:
        return Oe(t.type);
      case 16:
        return Oe("Lazy");
      case 13:
        return t.child !== l && l !== null ? Oe("Suspense Fallback") : Oe("Suspense");
      case 19:
        return Oe("SuspenseList");
      case 0:
      case 15:
        return Ki(t.type, !1);
      case 11:
        return Ki(t.type.render, !1);
      case 1:
        return Ki(t.type, !0);
      case 31:
        return Oe("Activity");
      case 30:
        return Oe("ViewTransition");
      default:
        return "";
    }
  }
  function Cs(t) {
    try {
      var l = "", e = null;
      do
        l += Oh(t, e), e = t, t = t.return;
      while (t);
      return l;
    } catch (a) {
      return `
Error generating stack: ` + a.message + `
` + a.stack;
    }
  }
  var Ji = Object.prototype.hasOwnProperty, $i = b.unstable_scheduleCallback, ki = b.unstable_cancelCallback, Ah = b.unstable_shouldYield, Mh = b.unstable_requestPaint, Nl = b.unstable_now, xh = b.unstable_getCurrentPriorityLevel, Hs = b.unstable_ImmediatePriority, js = b.unstable_UserBlockingPriority, mu = b.unstable_NormalPriority, Dh = b.unstable_LowPriority, qs = b.unstable_IdlePriority, Rh = b.log, Uh = b.unstable_setDisableYieldValue, gn = null, Ol = null;
  function Ae(t) {
    if (typeof Rh == "function" && Uh(t), Ol && typeof Ol.setStrictMode == "function")
      try {
        Ol.setStrictMode(gn, t);
      } catch {
      }
  }
  var Al = Math.clz32 ? Math.clz32 : jh, Ch = Math.log, Hh = Math.LN2;
  function jh(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (Ch(t) / Hh | 0) | 0;
  }
  var gu = 256, yu = 262144, bu = 4194304;
  function ta(t) {
    var l = t & 42;
    if (l !== 0) return l;
    switch (t & -t) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return t & -t;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return t & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return t;
    }
  }
  function Su(t, l, e) {
    var a = t.pendingLanes;
    if (a === 0) return 0;
    var n = 0, u = t.suspendedLanes, i = t.pingedLanes;
    t = t.warmLanes;
    var c = a & 134217727;
    return c !== 0 ? (a = c & ~u, a !== 0 ? n = ta(a) : (i &= c, i !== 0 ? n = ta(i) : e || (e = c & ~t, e !== 0 && (n = ta(e))))) : (c = a & ~u, c !== 0 ? n = ta(c) : i !== 0 ? n = ta(i) : e || (e = a & ~t, e !== 0 && (n = ta(e)))), n === 0 ? 0 : l !== 0 && l !== n && (l & u) === 0 && (u = n & -n, e = l & -l, u >= e || u === 32 && (e & 4194048) !== 0) ? l : n;
  }
  function yn(t, l) {
    return (t.pendingLanes & ~(t.suspendedLanes & ~t.pingedLanes) & l) === 0;
  }
  function Bs(t, l) {
    (l & 8) !== 0 && (l |= l & 32);
    var e = t.entangledLanes;
    if (e !== 0)
      for (t = t.entanglements, e &= l; 0 < e; ) {
        var a = 31 - Al(e), n = 1 << a;
        l |= t[a], e &= ~n;
      }
    return l;
  }
  function qh(t, l) {
    switch (t) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return l + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return l + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Ys() {
    var t = bu;
    return bu <<= 1, (bu & 62914560) === 0 && (bu = 4194304), t;
  }
  function Fi(t) {
    for (var l = [], e = 0; 31 > e; e++) l.push(t);
    return l;
  }
  function bn(t, l) {
    t.pendingLanes |= l, l !== 268435456 && (t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0);
  }
  function Bh(t, l, e, a, n, u) {
    var i = t.pendingLanes;
    t.pendingLanes = e, t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0, t.expiredLanes &= e, t.entangledLanes &= e, t.errorRecoveryDisabledLanes &= e, t.shellSuspendCounter = 0;
    var c = t.entanglements, f = t.expirationTimes, v = t.hiddenUpdates;
    for (e = i & ~e; 0 < e; ) {
      var y = 31 - Al(e), _ = 1 << y;
      c[y] = 0, f[y] = -1;
      var d = v[y];
      if (d !== null)
        for (v[y] = null, y = 0; y < d.length; y++) {
          var g = d[y];
          g !== null && (g.lane &= -536870913);
        }
      e &= ~_;
    }
    a !== 0 && ws(t, a, 0), u !== 0 && n === 0 && t.tag !== 0 && (t.suspendedLanes |= u & ~(i & ~l));
  }
  function ws(t, l, e) {
    t.pendingLanes |= l, t.suspendedLanes &= ~l;
    var a = 31 - Al(l);
    t.entangledLanes |= l, t.entanglements[a] = t.entanglements[a] | 1073741824 | e & 261930;
  }
  function Gs(t, l) {
    var e = t.entangledLanes |= l;
    for (t = t.entanglements; e; ) {
      var a = 31 - Al(e), n = 1 << a;
      n & l | t[a] & l && (t[a] |= l), e &= ~n;
    }
  }
  function Xs(t, l) {
    var e = l & -l;
    return e = (e & 42) !== 0 ? 1 : Wi(e), (e & (t.suspendedLanes | l)) !== 0 ? 0 : e;
  }
  function Wi(t) {
    switch (t) {
      case 2:
        t = 1;
        break;
      case 8:
        t = 4;
        break;
      case 32:
        t = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        t = 128;
        break;
      case 268435456:
        t = 134217728;
        break;
      default:
        t = 0;
    }
    return t;
  }
  function Ii(t) {
    return t &= -t, 2 < t ? 8 < t ? (t & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Qs() {
    var t = z.p;
    return t !== 0 ? t : (t = window.event, t === void 0 ? 32 : Fd(t.type));
  }
  function Zs(t, l) {
    var e = z.p;
    try {
      return z.p = t, l();
    } finally {
      z.p = e;
    }
  }
  var oe = Math.random().toString(36).slice(2), il = "__reactFiber$" + oe, Sl = "__reactProps$" + oe, za = "__reactContainer$" + oe, Vs = "__reactEvents$" + oe, Yh = "__reactListeners$" + oe, wh = "__reactHandles$" + oe, Ls = "__reactResources$" + oe, Sn = "__reactMarker$" + oe, pu = "__reactLoad$" + oe;
  function Tu(t) {
    delete t[il], delete t[Sl], delete t[Yh], delete t[wh];
  }
  function la(t) {
    var l;
    if (l = t[il]) return l;
    for (var e = t.parentNode; e; ) {
      if (l = e[za] || e[il]) {
        if (e = l.alternate, l.child !== null || e !== null && e.child !== null)
          for (t = Dd(t); t !== null; ) {
            if (e = t[il]) return e;
            t = Dd(t);
          }
        return l;
      }
      t = e, e = t.parentNode;
    }
    return null;
  }
  function Na(t) {
    if (t = t[il] || t[za]) {
      var l = t.tag;
      if (l === 5 || l === 6 || l === 13 || l === 31 || l === 26 || l === 27 || l === 3)
        return t;
    }
    return null;
  }
  function pn(t) {
    var l = t.tag;
    if (l === 5 || l === 26 || l === 27 || l === 6) return t.stateNode;
    throw Error(s(33));
  }
  function Oa(t) {
    var l = t[Ls];
    return l || (l = t[Ls] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), l;
  }
  function tl(t) {
    t[Sn] = !0;
  }
  function Ks(t) {
    t[pu] = void 0;
  }
  var Js = /* @__PURE__ */ new Set(), $s = {};
  function ea(t, l) {
    Aa(t, l), Aa(t + "Capture", l);
  }
  function Aa(t, l) {
    for ($s[t] = l, t = 0; t < l.length; t++)
      Js.add(l[t]);
  }
  var Gh = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), ks = {}, Fs = {};
  function Xh(t) {
    return Ji.call(Fs, t) ? !0 : Ji.call(ks, t) ? !1 : Gh.test(t) ? Fs[t] = !0 : (ks[t] = !0, !1);
  }
  var St = !1;
  function Ws() {
    var t = St;
    return St = !1, t;
  }
  function Eu(t, l, e) {
    if (Xh(l))
      if (e === null) t.removeAttribute(l);
      else {
        switch (typeof e) {
          case "undefined":
          case "function":
          case "symbol":
            t.removeAttribute(l);
            return;
          case "boolean":
            var a = l.toLowerCase().slice(0, 5);
            if (a !== "data-" && a !== "aria-") {
              t.removeAttribute(l);
              return;
            }
        }
        t.setAttribute(l, e);
      }
  }
  function _u(t, l, e) {
    if (e === null) t.removeAttribute(l);
    else {
      switch (typeof e) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          t.removeAttribute(l);
          return;
      }
      t.setAttribute(l, e);
    }
  }
  function re(t, l, e, a) {
    if (a === null) t.removeAttribute(e);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          t.removeAttribute(e);
          return;
      }
      t.setAttributeNS(l, e, a);
    }
  }
  function Ml(t) {
    switch (typeof t) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return t;
      case "object":
        return t;
      default:
        return "";
    }
  }
  function Is(t) {
    var l = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (l === "checkbox" || l === "radio");
  }
  function Qh(t, l, e) {
    var a = Object.getOwnPropertyDescriptor(
      t.constructor.prototype,
      l
    );
    if (!t.hasOwnProperty(l) && typeof a < "u" && typeof a.get == "function" && typeof a.set == "function") {
      var n = a.get, u = a.set;
      return Object.defineProperty(t, l, {
        configurable: !0,
        get: function() {
          return n.call(this);
        },
        set: function(i) {
          e = "" + i, u.call(this, i);
        }
      }), Object.defineProperty(t, l, {
        enumerable: a.enumerable
      }), {
        getValue: function() {
          return e;
        },
        setValue: function(i) {
          e = "" + i;
        },
        stopTracking: function() {
          t._valueTracker = null, delete t[l];
        }
      };
    }
  }
  function Pi(t) {
    if (!t._valueTracker) {
      var l = Is(t) ? "checked" : "value";
      t._valueTracker = Qh(
        t,
        l,
        "" + t[l]
      );
    }
  }
  function Ps(t) {
    if (!t) return !1;
    var l = t._valueTracker;
    if (!l) return !0;
    var e = l.getValue(), a = "";
    return t && (a = Is(t) ? t.checked ? "true" : "false" : t.value), t = a, t !== e ? (l.setValue(t), !0) : !1;
  }
  var Zh = /[\n"\\]/g;
  function Bl(t) {
    return t.replace(
      Zh,
      function(l) {
        return "\\" + l.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function tc(t, l, e, a, n, u, i, c) {
    t.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? t.type = i : t.removeAttribute("type"), l != null ? i === "number" ? (l === 0 && t.value === "" || t.value != l) && (t.value = "" + Ml(l)) : t.value !== "" + Ml(l) && (t.value = "" + Ml(l)) : i !== "submit" && i !== "reset" || t.removeAttribute("value"), l != null ? i === "number" && t.value == l ? lc(t, Ml(t.value)) : lc(t, Ml(l)) : e != null ? lc(t, Ml(e)) : a != null && t.removeAttribute("value"), n == null && u != null && (t.defaultChecked = !!u), n != null && (t.checked = n && typeof n != "function" && typeof n != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? t.name = "" + Ml(c) : t.removeAttribute("name");
  }
  function to(t, l, e, a, n, u, i, c) {
    if (u != null && typeof u != "function" && typeof u != "symbol" && typeof u != "boolean" && (t.type = u), l != null || e != null) {
      if (!(u !== "submit" && u !== "reset" || l != null)) {
        Pi(t);
        return;
      }
      e = e != null ? "" + Ml(e) : "", l = l != null ? "" + Ml(l) : e, c || l === t.value || (t.value = l), t.defaultValue = l;
    }
    a = a ?? n, a = typeof a != "function" && typeof a != "symbol" && !!a, t.checked = c ? t.checked : !!a, t.defaultChecked = !!a, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (t.name = i), Pi(t);
  }
  function lc(t, l) {
    t.defaultValue !== "" + l && (t.defaultValue = "" + l);
  }
  function Ma(t, l, e, a) {
    if (t = t.options, l) {
      l = {};
      for (var n = 0; n < e.length; n++)
        l["$" + e[n]] = !0;
      for (e = 0; e < t.length; e++)
        n = l.hasOwnProperty("$" + t[e].value), t[e].selected !== n && (t[e].selected = n), n && a && (t[e].defaultSelected = !0);
    } else {
      for (e = "" + Ml(e), l = null, n = 0; n < t.length; n++) {
        if (t[n].value === e) {
          t[n].selected = !0, a && (t[n].defaultSelected = !0);
          return;
        }
        l !== null || t[n].disabled || (l = t[n]);
      }
      l !== null && (l.selected = !0);
    }
  }
  function lo(t, l, e) {
    if (l != null && (l = "" + Ml(l), l !== t.value && (t.value = l), e == null)) {
      t.defaultValue !== l && (t.defaultValue = l);
      return;
    }
    t.defaultValue = e != null ? "" + Ml(e) : "";
  }
  function eo(t, l, e, a) {
    if (l == null) {
      if (a != null) {
        if (e != null) throw Error(s(92));
        if (K(a)) {
          if (1 < a.length) throw Error(s(93));
          a = a[0];
        }
        e = a;
      }
      e == null && (e = ""), l = e;
    }
    e = Ml(l), t.defaultValue = e, a = t.textContent, a === e && a !== "" && a !== null && (t.value = a), Pi(t);
  }
  function xa(t, l) {
    if (l) {
      var e = t.firstChild;
      if (e && e === t.lastChild && e.nodeType === 3) {
        e.nodeValue = l;
        return;
      }
    }
    t.textContent = l;
  }
  var Vh = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function ao(t, l, e) {
    var a = l.indexOf("--") === 0;
    e == null || typeof e == "boolean" || e === "" ? a ? t.setProperty(l, "") : l === "float" ? t.cssFloat = "" : t[l] = "" : a ? t.setProperty(l, e) : typeof e != "number" || e === 0 || Vh.has(l) ? l === "float" ? t.cssFloat = e : t[l] = ("" + e).trim() : t[l] = e + "px";
  }
  function no(t, l, e) {
    if (l != null && typeof l != "object")
      throw Error(s(62));
    if (t = t.style, e != null) {
      for (var a in e)
        !e.hasOwnProperty(a) || l != null && l.hasOwnProperty(a) || (a.indexOf("--") === 0 ? t.setProperty(a, "") : a === "float" ? t.cssFloat = "" : t[a] = "", St = !0);
      for (var n in l)
        a = l[n], l.hasOwnProperty(n) && e[n] !== a && (ao(t, n, a), St = !0);
    } else
      for (var u in l)
        l.hasOwnProperty(u) && ao(t, u, l[u]);
  }
  function ec(t) {
    if (t.indexOf("-") === -1) return !1;
    switch (t) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Lh = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["maskType", "mask-type"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), Kh = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function zu(t) {
    return Kh.test("" + t) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : t;
  }
  function Pl() {
  }
  var ac = null;
  function nc(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var Da = null, Ra = null;
  function uo(t) {
    var l = Na(t);
    if (l && (t = l.stateNode)) {
      var e = t[Sl] || null;
      t: switch (t = l.stateNode, l.type) {
        case "input":
          if (tc(
            t,
            e.value,
            e.defaultValue,
            e.defaultValue,
            e.checked,
            e.defaultChecked,
            e.type,
            e.name
          ), l = e.name, e.type === "radio" && l != null) {
            for (e = t; e.parentNode; ) e = e.parentNode;
            for (e = e.querySelectorAll(
              'input[name="' + Bl(
                "" + l
              ) + '"][type="radio"]'
            ), l = 0; l < e.length; l++) {
              var a = e[l];
              if (a !== t && a.form === t.form) {
                var n = a[Sl] || null;
                if (!n) throw Error(s(90));
                tc(
                  a,
                  n.value,
                  n.defaultValue,
                  n.defaultValue,
                  n.checked,
                  n.defaultChecked,
                  n.type,
                  n.name
                );
              }
            }
            for (l = 0; l < e.length; l++)
              a = e[l], a.form === t.form && Ps(a);
          }
          break t;
        case "textarea":
          lo(t, e.value, e.defaultValue);
          break t;
        case "select":
          l = e.value, l != null && Ma(t, !!e.multiple, l, !1);
      }
    }
  }
  var uc = !1;
  function io(t, l, e) {
    if (uc) return t(l, e);
    uc = !0;
    try {
      var a = t(l);
      return a;
    } finally {
      if (uc = !1, (Da !== null || Ra !== null) && (zi(), Da && (l = Da, t = Ra, Ra = Da = null, uo(l), t)))
        for (l = 0; l < t.length; l++) uo(t[l]);
    }
  }
  function Tn(t, l) {
    var e = t.stateNode;
    if (e === null) return null;
    var a = e[Sl] || null;
    if (a === null) return null;
    e = a[l];
    t: switch (l) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (a = !a.disabled) || (t = t.type, a = !(t === "button" || t === "input" || t === "select" || t === "textarea")), t = !a;
        break t;
      default:
        t = !1;
    }
    if (t) return null;
    if (e && typeof e != "function")
      throw Error(
        s(231, l, typeof e)
      );
    return e;
  }
  var de = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), ic = !1;
  if (de)
    try {
      var En = {};
      Object.defineProperty(En, "passive", {
        get: function() {
          ic = !0;
        }
      }), window.addEventListener("test", En, En), window.removeEventListener("test", En, En);
    } catch {
      ic = !1;
    }
  var Me = null, cc = null, Nu = null;
  function co() {
    if (Nu) return Nu;
    var t, l = cc, e = l.length, a, n = "value" in Me ? Me.value : Me.textContent, u = n.length;
    for (t = 0; t < e && l[t] === n[t]; t++) ;
    var i = e - t;
    for (a = 1; a <= i && l[e - a] === n[u - a]; a++) ;
    return Nu = n.slice(t, 1 < a ? 1 - a : void 0);
  }
  function Ou(t) {
    var l = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && l === 13 && (t = 13)) : t = l, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Au() {
    return !0;
  }
  function fo() {
    return !1;
  }
  function ml(t) {
    function l(e, a, n, u, i) {
      this._reactName = e, this._targetInst = n, this.type = a, this.nativeEvent = u, this.target = i, this.currentTarget = null;
      for (var c in t)
        t.hasOwnProperty(c) && (e = t[c], this[c] = e ? e(u) : u[c]);
      return this.isDefaultPrevented = (u.defaultPrevented != null ? u.defaultPrevented : u.returnValue === !1) ? Au : fo, this.isPropagationStopped = fo, this;
    }
    return G(l.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var e = this.nativeEvent;
        e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = Au);
      },
      stopPropagation: function() {
        var e = this.nativeEvent;
        e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = Au);
      },
      persist: function() {
      },
      isPersistent: Au
    }), l;
  }
  var xe = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(t) {
      return t.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Mu = ml(xe), _n = G({}, xe, { view: 0, detail: 0 }), Jh = ml(_n), fc, sc, zn, xu = G({}, _n, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: rc,
    button: 0,
    buttons: 0,
    relatedTarget: function(t) {
      return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
    },
    movementX: function(t) {
      return "movementX" in t ? t.movementX : (t !== zn && (zn && t.type === "mousemove" ? (fc = t.screenX - zn.screenX, sc = t.screenY - zn.screenY) : sc = fc = 0, zn = t), fc);
    },
    movementY: function(t) {
      return "movementY" in t ? t.movementY : sc;
    }
  }), so = ml(xu), $h = G({}, xu, { dataTransfer: 0 }), kh = ml($h), Fh = G({}, _n, { relatedTarget: 0 }), oc = ml(Fh), Wh = G({}, xe, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Ih = ml(Wh), Ph = G({}, xe, {
    clipboardData: function(t) {
      return "clipboardData" in t ? t.clipboardData : window.clipboardData;
    }
  }), tv = ml(Ph), lv = G({}, xe, { data: 0 }), oo = ml(lv), ev = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, av = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, nv = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function uv(t) {
    var l = this.nativeEvent;
    return l.getModifierState ? l.getModifierState(t) : (t = nv[t]) ? !!l[t] : !1;
  }
  function rc() {
    return uv;
  }
  var iv = G({}, _n, {
    key: function(t) {
      if (t.key) {
        var l = ev[t.key] || t.key;
        if (l !== "Unidentified") return l;
      }
      return t.type === "keypress" ? (t = Ou(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? av[t.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: rc,
    charCode: function(t) {
      return t.type === "keypress" ? Ou(t) : 0;
    },
    keyCode: function(t) {
      return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
    },
    which: function(t) {
      return t.type === "keypress" ? Ou(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
    }
  }), cv = ml(iv), fv = G({}, xu, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), ro = ml(fv), sv = G({}, xe, { submitter: 0 }), ov = ml(sv), rv = G({}, _n, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: rc
  }), dv = ml(rv), hv = G({}, xe, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), vv = ml(hv), mv = G({}, xu, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), gv = ml(mv), yv = G({}, xe, {
    newState: 0,
    oldState: 0,
    source: 0
  }), bv = ml(yv), Sv = [9, 13, 27, 32], dc = de && "CompositionEvent" in window, Nn = null;
  de && "documentMode" in document && (Nn = document.documentMode);
  var pv = de && "TextEvent" in window && !Nn, ho = de && (!dc || Nn && 8 < Nn && 11 >= Nn), vo = " ", mo = !1;
  function go(t, l) {
    switch (t) {
      case "keyup":
        return Sv.indexOf(l.keyCode) !== -1;
      case "keydown":
        return l.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function yo(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Ua = !1;
  function Tv(t, l) {
    switch (t) {
      case "compositionend":
        return yo(l);
      case "keypress":
        return l.which !== 32 ? null : (mo = !0, vo);
      case "textInput":
        return t = l.data, t === vo && mo ? null : t;
      default:
        return null;
    }
  }
  function Ev(t, l) {
    if (Ua)
      return t === "compositionend" || !dc && go(t, l) ? (t = co(), Nu = cc = Me = null, Ua = !1, t) : null;
    switch (t) {
      case "paste":
        return null;
      case "keypress":
        if (!(l.ctrlKey || l.altKey || l.metaKey) || l.ctrlKey && l.altKey) {
          if (l.char && 1 < l.char.length)
            return l.char;
          if (l.which) return String.fromCharCode(l.which);
        }
        return null;
      case "compositionend":
        return ho && l.locale !== "ko" ? null : l.data;
      default:
        return null;
    }
  }
  var _v = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function bo(t) {
    var l = t && t.nodeName && t.nodeName.toLowerCase();
    return l === "input" ? !!_v[t.type] : l === "textarea";
  }
  function So(t, l, e, a) {
    Da ? Ra ? Ra.push(a) : Ra = [a] : Da = a, l = Di(l, "onChange"), 0 < l.length && (e = new Mu(
      "onChange",
      "change",
      null,
      e,
      a
    ), t.push({ event: e, listeners: l }));
  }
  var On = null, An = null;
  function zv(t) {
    id(t, 0);
  }
  function Du(t) {
    var l = pn(t);
    if (Ps(l)) return t;
  }
  function po(t, l) {
    if (t === "change") return l;
  }
  var To = !1;
  if (de) {
    var hc;
    if (de) {
      var vc = "oninput" in document;
      if (!vc) {
        var Eo = document.createElement("div");
        Eo.setAttribute("oninput", "return;"), vc = typeof Eo.oninput == "function";
      }
      hc = vc;
    } else hc = !1;
    To = hc && (!document.documentMode || 9 < document.documentMode);
  }
  function _o() {
    On && (On.detachEvent("onpropertychange", zo), An = On = null);
  }
  function zo(t) {
    if (t.propertyName === "value" && Du(An)) {
      var l = [];
      So(
        l,
        An,
        t,
        nc(t)
      ), io(zv, l);
    }
  }
  function Nv(t, l, e) {
    t === "focusin" ? (_o(), On = l, An = e, On.attachEvent("onpropertychange", zo)) : t === "focusout" && _o();
  }
  function Ov(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown")
      return Du(An);
  }
  function Av(t, l) {
    if (t === "click") return Du(l);
  }
  function Mv(t, l) {
    if (t === "input" || t === "change")
      return Du(l);
  }
  function xv(t, l) {
    return t === l && (t !== 0 || 1 / t === 1 / l) || t !== t && l !== l;
  }
  var xl = typeof Object.is == "function" ? Object.is : xv;
  function Mn(t, l) {
    if (xl(t, l)) return !0;
    if (typeof t != "object" || t === null || typeof l != "object" || l === null)
      return !1;
    var e = Object.keys(t), a = Object.keys(l);
    if (e.length !== a.length) return !1;
    for (a = 0; a < e.length; a++) {
      var n = e[a];
      if (!Ji.call(l, n) || !xl(t[n], l[n]))
        return !1;
    }
    return !0;
  }
  function mc(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function No(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function Oo(t, l) {
    var e = No(t);
    t = 0;
    for (var a; e; ) {
      if (e.nodeType === 3) {
        if (a = t + e.textContent.length, t <= l && a >= l)
          return { node: e, offset: l - t };
        t = a;
      }
      t: {
        for (; e; ) {
          if (e.nextSibling) {
            e = e.nextSibling;
            break t;
          }
          e = e.parentNode;
        }
        e = void 0;
      }
      e = No(e);
    }
  }
  function Ao(t, l) {
    return t && l ? t === l ? !0 : t && t.nodeType === 3 ? !1 : l && l.nodeType === 3 ? Ao(t, l.parentNode) : "contains" in t ? t.contains(l) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(l) & 16) : !1 : !1;
  }
  function Mo(t) {
    t = t != null && t.ownerDocument != null && t.ownerDocument.defaultView != null ? t.ownerDocument.defaultView : window;
    for (var l = mc(t.document); l instanceof t.HTMLIFrameElement; ) {
      try {
        var e = typeof l.contentWindow.location.href == "string";
      } catch {
        e = !1;
      }
      if (e) t = l.contentWindow;
      else break;
      l = mc(t.document);
    }
    return l;
  }
  function gc(t) {
    var l = t && t.nodeName && t.nodeName.toLowerCase();
    return l && (l === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || l === "textarea" || t.contentEditable === "true");
  }
  var Dv = de && "documentMode" in document && 11 >= document.documentMode, Ca = null, yc = null, xn = null, bc = !1;
  function xo(t, l, e) {
    var a = e.window === e ? e.document : e.nodeType === 9 ? e : e.ownerDocument;
    bc || Ca == null || Ca !== mc(a) || (a = Ca, "selectionStart" in a && gc(a) ? a = { start: a.selectionStart, end: a.selectionEnd } : (a = (a.ownerDocument && a.ownerDocument.defaultView || window).getSelection(), a = {
      anchorNode: a.anchorNode,
      anchorOffset: a.anchorOffset,
      focusNode: a.focusNode,
      focusOffset: a.focusOffset
    }), xn && Mn(xn, a) || (xn = a, a = Di(yc, "onSelect"), 0 < a.length && (l = new Mu(
      "onSelect",
      "select",
      null,
      l,
      e
    ), t.push({ event: l, listeners: a }), l.target = Ca)));
  }
  function aa(t, l) {
    var e = {};
    return e[t.toLowerCase()] = l.toLowerCase(), e["Webkit" + t] = "webkit" + l, e["Moz" + t] = "moz" + l, e;
  }
  var Ha = {
    animationend: aa("Animation", "AnimationEnd"),
    animationiteration: aa("Animation", "AnimationIteration"),
    animationstart: aa("Animation", "AnimationStart"),
    transitionrun: aa("Transition", "TransitionRun"),
    transitionstart: aa("Transition", "TransitionStart"),
    transitioncancel: aa("Transition", "TransitionCancel"),
    transitionend: aa("Transition", "TransitionEnd")
  }, Sc = {}, Do = {};
  de && (Do = document.createElement("div").style, "AnimationEvent" in window || (delete Ha.animationend.animation, delete Ha.animationiteration.animation, delete Ha.animationstart.animation), "TransitionEvent" in window || delete Ha.transitionend.transition);
  function na(t) {
    if (Sc[t]) return Sc[t];
    if (!Ha[t]) return t;
    var l = Ha[t], e;
    for (e in l)
      if (l.hasOwnProperty(e) && e in Do)
        return Sc[t] = l[e];
    return t;
  }
  var Ro = na("animationend"), Uo = na("animationiteration"), Co = na("animationstart"), Rv = na("transitionrun"), Uv = na("transitionstart"), Cv = na("transitioncancel"), Ho = na("transitionend"), jo = /* @__PURE__ */ new Map(), pc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  pc.push("scrollEnd");
  function Kl(t, l) {
    jo.set(t, l), ea(l, [t]);
  }
  var Hv = 0;
  function he(t, l) {
    if (t.name != null && t.name !== "auto") return t.name;
    if (l.autoName !== null) return l.autoName;
    t = Fl.identifierPrefix;
    var e = Hv++;
    return t = "_" + t + "t_" + e.toString(32) + "_", l.autoName = t;
  }
  function qo(t) {
    if (t == null || typeof t == "string")
      return t;
    var l = null, e = tn;
    if (e !== null)
      for (var a = 0; a < e.length; a++) {
        var n = t[e[a]];
        if (n != null) {
          if (n === "none") return "none";
          l = l == null ? n : l + (" " + n);
        }
      }
    return l ?? t.default;
  }
  function ve(t, l) {
    return t = qo(t), l = qo(l), l == null ? t === "auto" ? null : t : l === "auto" ? null : l;
  }
  var Ru = typeof reportError == "function" ? reportError : function(t) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var l = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof t == "object" && t !== null && typeof t.message == "string" ? String(t.message) : String(t),
        error: t
      });
      if (!window.dispatchEvent(l)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", t);
      return;
    }
    console.error(t);
  }, Yl = [], ja = 0, Tc = 0;
  function Uu() {
    for (var t = ja, l = Tc = ja = 0; l < t; ) {
      var e = Yl[l];
      Yl[l++] = null;
      var a = Yl[l];
      Yl[l++] = null;
      var n = Yl[l];
      Yl[l++] = null;
      var u = Yl[l];
      if (Yl[l++] = null, a !== null && n !== null) {
        var i = a.pending;
        i === null ? n.next = n : (n.next = i.next, i.next = n), a.pending = n;
      }
      u !== 0 && Bo(e, n, u);
    }
  }
  function Cu(t, l, e, a) {
    Yl[ja++] = t, Yl[ja++] = l, Yl[ja++] = e, Yl[ja++] = a, Tc |= a, t.lanes |= a, t = t.alternate, t !== null && (t.lanes |= a);
  }
  function Ec(t, l, e, a) {
    return Cu(t, l, e, a), Hu(t);
  }
  function ua(t, l) {
    return Cu(t, null, null, l), Hu(t);
  }
  function Bo(t, l, e) {
    t.lanes |= e;
    var a = t.alternate;
    a !== null && (a.lanes |= e);
    for (var n = !1, u = t.return; u !== null; )
      u.childLanes |= e, a = u.alternate, a !== null && (a.childLanes |= e), u.tag === 22 && (t = u.stateNode, t === null || t._visibility & 1 || (n = !0)), t = u, u = u.return;
    return t.tag === 3 ? (u = t.stateNode, n && l !== null && (n = 31 - Al(e), t = u.hiddenUpdates, a = t[n], a === null ? t[n] = [l] : a.push(l), l.lane = e | 536870912), u) : null;
  }
  function Hu(t) {
    if (50 < Wn)
      throw Wn = 0, _i = null, Error(s(185));
    for (var l = t.return; l !== null; )
      t = l, l = t.return;
    return t.tag === 3 ? t.stateNode : null;
  }
  var qa = {};
  function jv(t, l, e, a) {
    this.tag = t, this.key = e, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = l, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = a, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function pl(t, l, e, a) {
    return new jv(t, l, e, a);
  }
  function _c(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function me(t, l) {
    var e = t.alternate;
    return e === null ? (e = pl(
      t.tag,
      l,
      t.key,
      t.mode
    ), e.elementType = t.elementType, e.type = t.type, e.stateNode = t.stateNode, e.alternate = t, t.alternate = e) : (e.pendingProps = l, e.type = t.type, e.flags = 0, e.subtreeFlags = 0, e.deletions = null), e.flags = t.flags & 1206910976, e.childLanes = t.childLanes, e.lanes = t.lanes, e.child = t.child, e.memoizedProps = t.memoizedProps, e.memoizedState = t.memoizedState, e.updateQueue = t.updateQueue, l = t.dependencies, e.dependencies = l === null ? null : { lanes: l.lanes, firstContext: l.firstContext }, e.sibling = t.sibling, e.index = t.index, e.ref = t.ref, e.refCleanup = t.refCleanup, e;
  }
  function Yo(t, l) {
    t.flags &= 1206910978;
    var e = t.alternate;
    return e === null ? (t.childLanes = 0, t.lanes = l, t.child = null, t.subtreeFlags = 0, t.memoizedProps = null, t.memoizedState = null, t.updateQueue = null, t.dependencies = null, t.stateNode = null) : (t.childLanes = e.childLanes, t.lanes = e.lanes, t.child = e.child, t.subtreeFlags = 0, t.deletions = null, t.memoizedProps = e.memoizedProps, t.memoizedState = e.memoizedState, t.updateQueue = e.updateQueue, t.type = e.type, l = e.dependencies, t.dependencies = l === null ? null : {
      lanes: l.lanes,
      firstContext: l.firstContext
    }), t;
  }
  function ju(t, l, e, a, n, u) {
    var i = 0;
    if (a = t, typeof a == "function") _c(a) && (i = 1);
    else if (typeof a == "string")
      i = s1(
        t,
        e,
        vl.current
      ) ? 26 : t === "html" || t === "head" || t === "body" ? 27 : 5;
    else
      t: switch (a) {
        case Et:
          return t = pl(31, e, l, n), t.elementType = Et, t.lanes = u, t;
        case dt:
          return ia(e.children, n, u, l);
        case Ct:
          i = 8, n |= 24;
          break;
        case Qt:
          return t = pl(12, e, l, n | 2), t.elementType = Qt, t.lanes = u, t;
        case R:
          return t = pl(13, e, l, n), t.elementType = R, t.lanes = u, t;
        case X:
          return t = pl(19, e, l, n), t.elementType = X, t.lanes = u, t;
        case Wt:
        case r:
          return t = n | 32, t = pl(30, e, l, t), t.elementType = r, t.lanes = u, t.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, t;
        default:
          if (typeof a == "object" && a !== null)
            switch (a.$$typeof) {
              case Mt:
                i = 10;
                break t;
              case ht:
                i = 9;
                break t;
              case M:
                i = 11;
                break t;
              case w:
                i = 14;
                break t;
              case V:
                i = 16, a = null;
                break t;
            }
          i = 29, e = Error(
            s(130, t === null ? "null" : typeof t, "")
          ), a = null;
      }
    return l = pl(i, e, l, n), l.elementType = t, l.type = a, l.lanes = u, l;
  }
  function ia(t, l, e, a) {
    return t = pl(7, t, a, l), t.lanes = e, t;
  }
  function zc(t, l, e) {
    return t = pl(6, t, null, l), t.lanes = e, t;
  }
  function wo(t) {
    var l = pl(18, null, null, 0);
    return l.stateNode = t, l;
  }
  function Nc(t, l, e) {
    return l = pl(
      4,
      t.children !== null ? t.children : [],
      t.key,
      l
    ), l.lanes = e, l.stateNode = {
      containerInfo: t.containerInfo,
      pendingChildren: null,
      implementation: t.implementation
    }, l;
  }
  var Go = /* @__PURE__ */ new WeakMap();
  function wl(t, l) {
    if (typeof t == "object" && t !== null) {
      var e = Go.get(t);
      return e !== void 0 ? e : (l = {
        value: t,
        source: l,
        stack: Cs(l)
      }, Go.set(t, l), l);
    }
    return {
      value: t,
      source: l,
      stack: Cs(l)
    };
  }
  var Ba = [], Ya = 0, qu = null, Dn = 0, Gl = [], Xl = 0, De = null, te = 1, le = "";
  function ge(t, l) {
    Ba[Ya++] = Dn, Ba[Ya++] = qu, qu = t, Dn = l;
  }
  function Xo(t, l, e) {
    Gl[Xl++] = te, Gl[Xl++] = le, Gl[Xl++] = De, De = t;
    var a = te;
    t = le;
    var n = 32 - Al(a) - 1;
    a &= ~(1 << n), e += 1;
    var u = 32 - Al(l) + n;
    if (30 < u) {
      var i = n - n % 5;
      u = (a & (1 << i) - 1).toString(32), a >>= i, n -= i, te = 1 << 32 - Al(l) + n | e << n | a, le = u + t;
    } else
      te = 1 << u | e << n | a, le = t;
  }
  function Bu(t) {
    t.return !== null && (ge(t, 1), Xo(t, 1, 0));
  }
  function Oc(t) {
    for (; t === qu; )
      qu = Ba[--Ya], Ba[Ya] = null, Dn = Ba[--Ya], Ba[Ya] = null;
    for (; t === De; )
      De = Gl[--Xl], Gl[Xl] = null, le = Gl[--Xl], Gl[Xl] = null, te = Gl[--Xl], Gl[Xl] = null;
  }
  function Qo(t, l) {
    Gl[Xl++] = te, Gl[Xl++] = le, Gl[Xl++] = De, te = l.id, le = l.overflow, De = t;
  }
  var ll = null, Yt = null, et = !1, Re = null, Ql = !1, Ac = Error(s(519));
  function Ue(t) {
    var l = Error(
      s(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Rn(wl(l, t)), Ac;
  }
  function Zo(t) {
    var l = t.stateNode, e = t.type, a = t.memoizedProps;
    switch (l[il] = t, l[Sl] = a, e) {
      case "dialog":
        ft("cancel", l), ft("close", l);
        break;
      case "iframe":
      case "object":
      case "embed":
        ft("load", l);
        break;
      case "video":
      case "audio":
        for (e = 0; e < Pn.length; e++)
          ft(Pn[e], l);
        break;
      case "source":
        ft("error", l);
        break;
      case "img":
      case "image":
      case "link":
        ft("error", l), ft("load", l);
        break;
      case "details":
        ft("toggle", l);
        break;
      case "input":
        ft("invalid", l), to(
          l,
          a.value,
          a.defaultValue,
          a.checked,
          a.defaultChecked,
          a.type,
          a.name,
          !0
        );
        break;
      case "select":
        ft("invalid", l);
        break;
      case "textarea":
        ft("invalid", l), eo(l, a.value, a.defaultValue, a.children);
    }
    e = a.children, typeof e != "string" && typeof e != "number" && typeof e != "bigint" || l.textContent === "" + e || a.suppressHydrationWarning === !0 || od(l.textContent, e) ? (a.popover != null && (ft("beforetoggle", l), ft("toggle", l)), a.onScroll != null && ft("scroll", l), a.onScrollEnd != null && ft("scrollend", l), a.onClick != null && (l.onclick = Pl), l = !0) : l = !1, l || Ue(t, !0);
  }
  function Yu(t) {
    for (ll = t.return; ll; )
      switch (ll.tag) {
        case 5:
        case 31:
        case 13:
          Ql = !1;
          return;
        case 27:
        case 3:
          Ql = !0;
          return;
        default:
          ll = ll.return;
      }
  }
  function wa(t) {
    if (t !== ll) return !1;
    if (!et) return Yu(t), et = !0, !1;
    var l = t.tag, e;
    if ((e = l !== 3 && l !== 27) && ((e = l === 5) && (e = t.type, e = !(e !== "form" && e !== "button") || ns(t.type, t.memoizedProps)), e = !e), e && Yt && Ue(t), Yu(t), l === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(s(317));
      Yt = xd(t);
    } else if (l === 31) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(s(317));
      Yt = xd(t);
    } else
      l === 27 ? (l = Yt, $e(t.type) ? (t = hs, hs = null, Yt = t) : Yt = l) : Yt = ll ? Vl(t.stateNode.nextSibling) : null;
    return !0;
  }
  function ca() {
    Yt = ll = null, et = !1;
  }
  function Mc() {
    var t = Re;
    return t !== null && (_l === null ? _l = t : _l.push.apply(
      _l,
      t
    ), Re = null), t;
  }
  function Rn(t) {
    Re === null ? Re = [t] : Re.push(t);
  }
  var xc = st(null), fa = null, ye = null;
  function Ce(t, l, e) {
    gt(xc, l._currentValue), l._currentValue = e;
  }
  function be(t) {
    t._currentValue = xc.current, it(xc);
  }
  function wu(t, l, e) {
    for (; t !== null; ) {
      var a = t.alternate;
      if ((t.childLanes & l) !== l ? (t.childLanes |= l, a !== null && (a.childLanes |= l)) : a !== null && (a.childLanes & l) !== l && (a.childLanes |= l), t === e) break;
      t = t.return;
    }
  }
  function Dc(t, l, e, a) {
    var n = t.child;
    for (n !== null && (n.return = t); n !== null; ) {
      var u = n.dependencies;
      if (u !== null) {
        var i = n.child;
        u = u.firstContext;
        t: for (; u !== null; ) {
          var c = u;
          u = n;
          for (var f = 0; f < l.length; f++)
            if (c.context === l[f]) {
              u.lanes |= e, c = u.alternate, c !== null && (c.lanes |= e), wu(
                u.return,
                e,
                t
              ), a || (i = null);
              break t;
            }
          u = c.next;
        }
      } else if (n.tag === 18) {
        if (i = n.return, i === null) throw Error(s(341));
        i.lanes |= e, u = i.alternate, u !== null && (u.lanes |= e), wu(i, e, t), i = null;
      } else
        n.tag === 13 && n.memoizedState !== null && n.memoizedState.dehydrated === null ? (n.lanes |= e, i = n.alternate, i !== null && (i.lanes |= e), wu(
          n.return,
          e,
          t
        ), i = n.child, i = i !== null ? i.sibling : null) : i = n.child;
      if (i !== null) i.return = n;
      else
        for (i = n; i !== null; ) {
          if (i === t) {
            i = null;
            break;
          }
          if (n = i.sibling, n !== null) {
            n.return = i.return, i = n;
            break;
          }
          i = i.return;
        }
      n = i;
    }
  }
  function sa(t, l, e, a) {
    t = null;
    for (var n = l, u = !1; n !== null; ) {
      if (!u) {
        if ((n.flags & 524288) !== 0) u = !0;
        else if ((n.flags & 262144) !== 0) break;
      }
      if (n.tag === 10) {
        var i = n.alternate;
        if (i === null) throw Error(s(387));
        if (i = i.memoizedProps, i !== null) {
          var c = n.type;
          xl(n.pendingProps.value, i.value) || (t !== null ? t.push(c) : t = [c]);
        }
      } else if (n === du.current) {
        if (i = n.alternate, i === null) throw Error(s(387));
        i.memoizedState.memoizedState !== n.memoizedState.memoizedState && (t !== null ? t.push(rn) : t = [rn]);
      }
      n = n.return;
    }
    return t !== null && Dc(
      l,
      t,
      e,
      a
    ), l.flags |= 262144, t !== null;
  }
  function Gu(t) {
    for (t = t.firstContext; t !== null; ) {
      if (!xl(
        t.context._currentValue,
        t.memoizedValue
      ))
        return !0;
      t = t.next;
    }
    return !1;
  }
  function oa(t) {
    fa = t, ye = null, t = t.dependencies, t !== null && (t.firstContext = null);
  }
  function cl(t) {
    return Vo(fa, t);
  }
  function Xu(t, l) {
    return fa === null && oa(t), Vo(t, l);
  }
  function Vo(t, l) {
    var e = l._currentValue;
    if (l = { context: l, memoizedValue: e, next: null }, ye === null) {
      if (t === null) throw Error(s(308));
      ye = l, t.dependencies = { lanes: 0, firstContext: l }, t.flags |= 524288;
    } else ye = ye.next = l;
    return e;
  }
  var qv = typeof AbortController < "u" ? AbortController : function() {
    var t = [], l = this.signal = {
      aborted: !1,
      addEventListener: function(e, a) {
        t.push(a);
      }
    };
    this.abort = function() {
      l.aborted = !0, t.forEach(function(e) {
        return e();
      });
    };
  }, Bv = b.unstable_scheduleCallback, Yv = b.unstable_NormalPriority, Jt = {
    $$typeof: Mt,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Rc() {
    return {
      controller: new qv(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Un(t) {
    t.refCount--, t.refCount === 0 && Bv(Yv, function() {
      t.controller.abort();
    });
  }
  function Lo(t, l) {
    if ((t.pendingLanes & 4194048) !== 0) {
      var e = t.transitionTypes;
      for (e === null && (e = t.transitionTypes = []), t = 0; t < l.length; t++) {
        var a = l[t];
        e.indexOf(a) === -1 && e.push(a);
      }
    }
  }
  var Cn = null;
  function wv(t) {
    var l = t.transitionTypes;
    return t.transitionTypes = null, l;
  }
  var Hn = null, Uc = 0, ra = 0, Ga = null;
  function Gv(t, l) {
    if (Hn === null) {
      var e = Hn = [];
      Uc = 0, ra = kf(), Ga = {
        status: "pending",
        value: void 0,
        then: function(a) {
          e.push(a);
        }
      };
    }
    return Uc++, l.then(Ko, Ko), l;
  }
  function Ko() {
    if (--Uc === 0 && (Cn = null, Hn !== null)) {
      Ga !== null && (Ga.status = "fulfilled");
      var t = Hn;
      Hn = null, ra = 0, Ga = null;
      for (var l = 0; l < t.length; l++) (0, t[l])();
    }
  }
  function Xv(t, l) {
    var e = [], a = {
      status: "pending",
      value: null,
      reason: null,
      then: function(n) {
        e.push(n);
      }
    };
    return t.then(
      function() {
        a.status = "fulfilled", a.value = l;
        for (var n = 0; n < e.length; n++) (0, e[n])(l);
      },
      function(n) {
        for (a.status = "rejected", a.reason = n, n = 0; n < e.length; n++)
          (0, e[n])(void 0);
      }
    ), a;
  }
  var Jo = C.S;
  C.S = function(t, l) {
    if (w0 = Nl(), typeof l == "object" && l !== null && typeof l.then == "function" && Gv(t, l), Cn !== null)
      for (var e = nn; e !== null; )
        Lo(e, Cn), e = e.next;
    if (e = t.types, e !== null) {
      for (var a = nn; a !== null; )
        Lo(a, e), a = a.next;
      if (ra !== 0) {
        a = Cn, a === null && (a = Cn = []);
        for (var n = 0; n < e.length; n++) {
          var u = e[n];
          a.indexOf(u) === -1 && a.push(u);
        }
      }
    }
    Jo !== null && Jo(t, l);
  };
  var da = st(null);
  function Cc() {
    var t = da.current;
    return t !== null ? t : qt.pooledCache;
  }
  function Qu(t, l) {
    l === null ? gt(da, da.current) : gt(da, l.pool);
  }
  function $o() {
    var t = Cc();
    return t === null ? null : { parent: Jt._currentValue, pool: t };
  }
  var Xa = Error(s(460)), Hc = Error(s(474)), Zu = Error(s(542)), Vu = { then: function() {
  } };
  function ko(t) {
    return t = t.status, t === "fulfilled" || t === "rejected";
  }
  function Fo(t, l, e) {
    switch (e = t[e], e === void 0 ? t.push(l) : e !== l && (l.then(Pl, Pl), l = e), l.status) {
      case "fulfilled":
        return l.value;
      case "rejected":
        throw t = l.reason, Io(t), t === void 0 && !("reason" in l) ? Error(s(600)) : t;
      default:
        if (typeof l.status == "string") l.then(Pl, Pl);
        else {
          if (t = qt, t !== null && 100 < t.shellSuspendCounter)
            throw Error(s(482));
          t = l, t.status = "pending", t.then(
            function(a) {
              if (l.status === "pending") {
                var n = l;
                n.status = "fulfilled", n.value = a;
              }
            },
            function(a) {
              if (l.status === "pending") {
                var n = l;
                n.status = "rejected", n.reason = a;
              }
            }
          );
        }
        switch (l.status) {
          case "fulfilled":
            return l.value;
          case "rejected":
            throw t = l.reason, Io(t), t;
        }
        throw va = l, Xa;
    }
  }
  function ha(t) {
    try {
      var l = t._init;
      return l(t._payload);
    } catch (e) {
      throw e !== null && typeof e == "object" && typeof e.then == "function" ? (va = e, Xa) : e;
    }
  }
  var va = null;
  function Wo() {
    if (va === null) throw Error(s(459));
    var t = va;
    return va = null, t;
  }
  function Io(t) {
    if (t === Xa || t === Zu)
      throw Error(s(483));
  }
  var Qa = null, jn = 0;
  function Lu(t) {
    var l = jn;
    return jn += 1, Qa === null && (Qa = []), Fo(Qa, t, l);
  }
  function He(t, l) {
    l = l.props.ref, t.ref = l !== void 0 ? l : null;
  }
  function Ku(t, l) {
    throw l.$$typeof === W ? Error(s(525)) : (t = Object.prototype.toString.call(l), Error(
      s(
        31,
        t === "[object Object]" ? "object with keys {" + Object.keys(l).join(", ") + "}" : t
      )
    ));
  }
  function Po(t) {
    function l(h, o) {
      if (t) {
        var m = h.deletions;
        m === null ? (h.deletions = [o], h.flags |= 16) : m.push(o);
      }
    }
    function e(h, o) {
      if (!t) return null;
      for (; o !== null; )
        l(h, o), o = o.sibling;
      return null;
    }
    function a(h) {
      for (var o = /* @__PURE__ */ new Map(); h !== null; )
        h.key === null ? o.set(h.index, h) : o.set(h.key, h), h = h.sibling;
      return o;
    }
    function n(h, o) {
      return h = me(h, o), h.index = 0, h.sibling = null, h;
    }
    function u(h, o, m) {
      return h.index = m, t ? (m = h.alternate, m !== null ? (m = m.index, m < o ? (h.flags |= 2, o) : m) : (h.flags |= 134217730, o)) : (h.flags |= 1048576, o);
    }
    function i(h) {
      return t && h.alternate === null && (h.flags |= 134217730), h;
    }
    function c(h, o, m, E) {
      return o === null || o.tag !== 6 ? (o = zc(m, h.mode, E), o.return = h, o) : (o = n(o, m), o.return = h, o);
    }
    function f(h, o, m, E) {
      var H = m.type;
      return H === dt ? (h = y(
        h,
        o,
        m.props.children,
        E,
        m.key
      ), He(h, m), h) : o !== null && (o.elementType === H || typeof H == "object" && H !== null && H.$$typeof === V && ha(H) === o.type) ? (o = n(o, m.props), He(o, m), o.return = h, o) : (o = ju(
        m.type,
        m.key,
        m.props,
        null,
        h.mode,
        E
      ), He(o, m), o.return = h, o);
    }
    function v(h, o, m, E) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== m.containerInfo || o.stateNode.implementation !== m.implementation ? (o = Nc(m, h.mode, E), o.return = h, o) : (o = n(o, m.children || []), o.return = h, o);
    }
    function y(h, o, m, E, H) {
      return o === null || o.tag !== 7 ? (o = ia(
        m,
        h.mode,
        E,
        H
      ), o.return = h, o) : (o = n(o, m), o.return = h, o);
    }
    function _(h, o, m) {
      if (typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint")
        return o = zc(
          "" + o,
          h.mode,
          m
        ), o.return = h, o;
      if (typeof o == "object" && o !== null) {
        switch (o.$$typeof) {
          case Pt:
            return m = ju(
              o.type,
              o.key,
              o.props,
              null,
              h.mode,
              m
            ), He(m, o), m.return = h, m;
          case Bt:
            return o = Nc(
              o,
              h.mode,
              m
            ), o.return = h, o;
          case V:
            return o = ha(o), _(h, o, m);
        }
        if (K(o) || U(o))
          return o = ia(
            o,
            h.mode,
            m,
            null
          ), o.return = h, o;
        if (typeof o.then == "function")
          return _(h, Lu(o), m);
        if (o.$$typeof === Mt)
          return _(
            h,
            Xu(h, o),
            m
          );
        Ku(h, o);
      }
      return null;
    }
    function d(h, o, m, E) {
      var H = o !== null ? o.key : null;
      if (typeof m == "string" && m !== "" || typeof m == "number" || typeof m == "bigint")
        return H !== null ? null : c(h, o, "" + m, E);
      if (typeof m == "object" && m !== null) {
        switch (m.$$typeof) {
          case Pt:
            return m.key === H ? f(h, o, m, E) : null;
          case Bt:
            return m.key === H ? v(h, o, m, E) : null;
          case V:
            return m = ha(m), d(h, o, m, E);
        }
        if (K(m) || U(m))
          return H !== null ? null : y(h, o, m, E, null);
        if (typeof m.then == "function")
          return d(
            h,
            o,
            Lu(m),
            E
          );
        if (m.$$typeof === Mt)
          return d(
            h,
            o,
            Xu(h, m),
            E
          );
        Ku(h, m);
      }
      return null;
    }
    function g(h, o, m, E, H) {
      if (typeof E == "string" && E !== "" || typeof E == "number" || typeof E == "bigint")
        return h = h.get(m) || null, c(o, h, "" + E, H);
      if (typeof E == "object" && E !== null) {
        switch (E.$$typeof) {
          case Pt:
            return h = h.get(
              E.key === null ? m : E.key
            ) || null, f(o, h, E, H);
          case Bt:
            return h = h.get(
              E.key === null ? m : E.key
            ) || null, v(o, h, E, H);
          case V:
            return E = ha(E), g(
              h,
              o,
              m,
              E,
              H
            );
        }
        if (K(E) || U(E))
          return h = h.get(m) || null, y(o, h, E, H, null);
        if (typeof E.then == "function")
          return g(
            h,
            o,
            m,
            Lu(E),
            H
          );
        if (E.$$typeof === Mt)
          return g(
            h,
            o,
            m,
            Xu(o, E),
            H
          );
        Ku(o, E);
      }
      return null;
    }
    function D(h, o, m, E) {
      for (var H = null, rt = null, Z = o, L = o = 0, Ft = null; Z !== null && L < m.length; L++) {
        Z.index > L ? (Ft = Z, Z = null) : Ft = Z.sibling;
        var yt = d(
          h,
          Z,
          m[L],
          E
        );
        if (yt === null) {
          Z === null && (Z = Ft);
          break;
        }
        t && Z && yt.alternate === null && l(h, Z), o = u(yt, o, L), rt === null ? H = yt : rt.sibling = yt, rt = yt, Z = Ft;
      }
      if (L === m.length)
        return e(h, Z), et && ge(h, L), H;
      if (Z === null) {
        for (; L < m.length; L++)
          Z = _(h, m[L], E), Z !== null && (o = u(
            Z,
            o,
            L
          ), rt === null ? H = Z : rt.sibling = Z, rt = Z);
        return et && ge(h, L), H;
      }
      for (Z = a(Z); L < m.length; L++)
        Ft = g(
          Z,
          h,
          L,
          m[L],
          E
        ), Ft !== null && (t && (yt = Ft.alternate, yt !== null && Z.delete(yt.key === null ? L : yt.key)), o = u(
          Ft,
          o,
          L
        ), rt === null ? H = Ft : rt.sibling = Ft, rt = Ft);
      return t && Z.forEach(function(Pe) {
        return l(h, Pe);
      }), et && ge(h, L), H;
    }
    function B(h, o, m, E) {
      if (m == null) throw Error(s(151));
      for (var H = null, rt = null, Z = o, L = o = 0, Ft = null, yt = m.next(); Z !== null && !yt.done; L++, yt = m.next()) {
        Z.index > L ? (Ft = Z, Z = null) : Ft = Z.sibling;
        var Pe = d(h, Z, yt.value, E);
        if (Pe === null) {
          Z === null && (Z = Ft);
          break;
        }
        t && Z && Pe.alternate === null && l(h, Z), o = u(Pe, o, L), rt === null ? H = Pe : rt.sibling = Pe, rt = Pe, Z = Ft;
      }
      if (yt.done)
        return e(h, Z), et && ge(h, L), H;
      if (Z === null) {
        for (; !yt.done; L++, yt = m.next())
          yt = _(h, yt.value, E), yt !== null && (o = u(yt, o, L), rt === null ? H = yt : rt.sibling = yt, rt = yt);
        return et && ge(h, L), H;
      }
      for (Z = a(Z); !yt.done; L++, yt = m.next())
        yt = g(Z, h, L, yt.value, E), yt !== null && (t && (Ft = yt.alternate, Ft !== null && Z.delete(
          Ft.key === null ? L : Ft.key
        )), o = u(yt, o, L), rt === null ? H = yt : rt.sibling = yt, rt = yt);
      return t && Z.forEach(function(T1) {
        return l(h, T1);
      }), et && ge(h, L), H;
    }
    function tt(h, o, m, E) {
      if (typeof m == "object" && m !== null && m.type === dt && m.key === null && m.props.ref === void 0 && (m = m.props.children), typeof m == "object" && m !== null) {
        switch (m.$$typeof) {
          case Pt:
            t: {
              for (var H = m.key; o !== null; ) {
                if (o.key === H) {
                  if (H = m.type, H === dt) {
                    if (o.tag === 7) {
                      e(
                        h,
                        o.sibling
                      ), E = n(
                        o,
                        m.props.children
                      ), He(E, m), E.return = h, h = E;
                      break t;
                    }
                  } else if (o.elementType === H || typeof H == "object" && H !== null && H.$$typeof === V && ha(H) === o.type) {
                    e(
                      h,
                      o.sibling
                    ), E = n(o, m.props), He(E, m), E.return = h, h = E;
                    break t;
                  }
                  e(h, o);
                  break;
                } else l(h, o);
                o = o.sibling;
              }
              m.type === dt ? (E = ia(
                m.props.children,
                h.mode,
                E,
                m.key
              ), He(E, m), E.return = h, h = E) : (E = ju(
                m.type,
                m.key,
                m.props,
                null,
                h.mode,
                E
              ), He(E, m), E.return = h, h = E);
            }
            return i(h);
          case Bt:
            t: {
              for (H = m.key; o !== null; ) {
                if (o.key === H)
                  if (o.tag === 4 && o.stateNode.containerInfo === m.containerInfo && o.stateNode.implementation === m.implementation) {
                    e(
                      h,
                      o.sibling
                    ), E = n(o, m.children || []), E.return = h, h = E;
                    break t;
                  } else {
                    e(h, o);
                    break;
                  }
                else l(h, o);
                o = o.sibling;
              }
              E = Nc(m, h.mode, E), E.return = h, h = E;
            }
            return i(h);
          case V:
            return m = ha(m), tt(
              h,
              o,
              m,
              E
            );
        }
        if (K(m))
          return D(
            h,
            o,
            m,
            E
          );
        if (U(m)) {
          if (H = U(m), typeof H != "function") throw Error(s(150));
          return m = H.call(m), B(
            h,
            o,
            m,
            E
          );
        }
        if (typeof m.then == "function")
          return tt(
            h,
            o,
            Lu(m),
            E
          );
        if (m.$$typeof === Mt)
          return tt(
            h,
            o,
            Xu(h, m),
            E
          );
        Ku(h, m);
      }
      return typeof m == "string" && m !== "" || typeof m == "number" || typeof m == "bigint" ? (m = "" + m, o !== null && o.tag === 6 ? (e(h, o.sibling), E = n(o, m), E.return = h, h = E) : (e(h, o), E = zc(m, h.mode, E), E.return = h, h = E), i(h)) : e(h, o);
    }
    return function(h, o, m, E) {
      try {
        jn = 0;
        var H = tt(
          h,
          o,
          m,
          E
        );
        return Qa = null, H;
      } catch (Z) {
        if (Z === Xa || Z === Zu) throw Z;
        var rt = pl(29, Z, null, h.mode);
        return rt.lanes = E, rt.return = h, rt;
      } finally {
      }
    };
  }
  var ma = Po(!0), tr = Po(!1), je = !1;
  function jc(t) {
    t.updateQueue = {
      baseState: t.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function qc(t, l) {
    t = t.updateQueue, l.updateQueue === t && (l.updateQueue = {
      baseState: t.baseState,
      firstBaseUpdate: t.firstBaseUpdate,
      lastBaseUpdate: t.lastBaseUpdate,
      shared: t.shared,
      callbacks: null
    });
  }
  function qe(t) {
    return { lane: t, tag: 0, payload: null, callback: null, next: null };
  }
  function Be(t, l, e) {
    var a = t.updateQueue;
    if (a === null) return null;
    if (a = a.shared, (_t & 2) !== 0) {
      var n = a.pending;
      return n === null ? l.next = l : (l.next = n.next, n.next = l), a.pending = l, l = Hu(t), Bo(t, null, e), l;
    }
    return Cu(t, a, l, e), Hu(t);
  }
  function qn(t, l, e) {
    if (l = l.updateQueue, l !== null && (l = l.shared, (e & 4194048) !== 0)) {
      var a = l.lanes;
      a &= t.pendingLanes, e |= a, l.lanes = e, Gs(t, e);
    }
  }
  function Bc(t, l) {
    var e = t.updateQueue, a = t.alternate;
    if (a !== null && (a = a.updateQueue, e === a)) {
      var n = null, u = null;
      if (e = e.firstBaseUpdate, e !== null) {
        do {
          var i = {
            lane: e.lane,
            tag: e.tag,
            payload: e.payload,
            callback: null,
            next: null
          };
          u === null ? n = u = i : u = u.next = i, e = e.next;
        } while (e !== null);
        u === null ? n = u = l : u = u.next = l;
      } else n = u = l;
      e = {
        baseState: a.baseState,
        firstBaseUpdate: n,
        lastBaseUpdate: u,
        shared: a.shared,
        callbacks: a.callbacks
      }, t.updateQueue = e;
      return;
    }
    t = e.lastBaseUpdate, t === null ? e.firstBaseUpdate = l : t.next = l, e.lastBaseUpdate = l;
  }
  var Yc = !1;
  function Bn() {
    if (Yc) {
      var t = Ga;
      if (t !== null) throw t;
    }
  }
  function Yn(t, l, e, a) {
    Yc = !1;
    var n = t.updateQueue;
    je = !1;
    var u = n.firstBaseUpdate, i = n.lastBaseUpdate, c = n.shared.pending;
    if (c !== null) {
      n.shared.pending = null;
      var f = c, v = f.next;
      f.next = null, i === null ? u = v : i.next = v, i = f;
      var y = t.alternate;
      y !== null && (y = y.updateQueue, c = y.lastBaseUpdate, c !== i && (c === null ? y.firstBaseUpdate = v : c.next = v, y.lastBaseUpdate = f));
    }
    if (u !== null) {
      var _ = n.baseState;
      i = 0, y = v = f = null, c = u;
      do {
        var d = c.lane & -536870913, g = d !== c.lane;
        if (g ? (ot & d) === d : (a & d) === d) {
          d !== 0 && d === ra && (Yc = !0), y !== null && (y = y.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          t: {
            var D = t, B = c;
            d = l;
            var tt = e;
            switch (B.tag) {
              case 1:
                if (D = B.payload, typeof D == "function") {
                  _ = D.call(tt, _, d);
                  break t;
                }
                _ = D;
                break t;
              case 3:
                D.flags = D.flags & -65537 | 128;
              case 0:
                if (D = B.payload, d = typeof D == "function" ? D.call(tt, _, d) : D, d == null) break t;
                _ = G({}, _, d);
                break t;
              case 2:
                je = !0;
            }
          }
          d = c.callback, d !== null && (t.flags |= 64, g && (t.flags |= 8192), g = n.callbacks, g === null ? n.callbacks = [d] : g.push(d));
        } else
          g = {
            lane: d,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, y === null ? (v = y = g, f = _) : y = y.next = g, i |= d;
        if (c = c.next, c === null) {
          if (c = n.shared.pending, c === null)
            break;
          g = c, c = g.next, g.next = null, n.lastBaseUpdate = g, n.shared.pending = null;
        }
      } while (!0);
      y === null && (f = _), n.baseState = f, n.firstBaseUpdate = v, n.lastBaseUpdate = y, u === null && (n.shared.lanes = 0), Ve |= i, t.lanes = i, t.memoizedState = _;
    }
  }
  function lr(t, l) {
    if (typeof t != "function")
      throw Error(s(191, t));
    t.call(l);
  }
  function er(t, l) {
    var e = t.callbacks;
    if (e !== null)
      for (t.callbacks = null, t = 0; t < e.length; t++)
        lr(e[t], l);
  }
  var Ye = st(null), Ju = st(0);
  function ar(t, l) {
    t = _e, gt(Ju, t), gt(Ye, l), _e = t | l.baseLanes;
  }
  function wc() {
    gt(Ju, _e), gt(Ye, Ye.current);
  }
  function Gc() {
    _e = Ju.current, it(Ye), it(Ju);
  }
  var fl = st(null), hl = null;
  function we(t) {
    var l = t.alternate;
    gt(sl, sl.current & 1), gt(fl, t), hl === null && (l === null || Ye.current !== null || l.memoizedState !== null) && (hl = t);
  }
  function Xc(t) {
    gt(sl, sl.current), gt(fl, t), hl === null && (hl = t);
  }
  function nr(t) {
    t.tag === 22 ? (gt(sl, sl.current), gt(fl, t), hl === null && (hl = t)) : Ge();
  }
  function Ge() {
    gt(sl, sl.current), gt(fl, fl.current);
  }
  function Dl(t) {
    it(fl), hl === t && (hl = null), it(sl);
  }
  var sl = st(0);
  function wn(t, l) {
    gt(fl, fl.current), gt(sl, l);
  }
  function Qc(t) {
    it(sl), it(fl), hl === t && (hl = null);
  }
  function $u(t) {
    for (var l = t; l !== null; ) {
      if (l.tag === 13) {
        var e = l.memoizedState;
        if (e !== null && (e = e.dehydrated, e === null || rs(e) || ds(e)))
          return l;
      } else if (l.tag === 19 && l.memoizedProps.revealOrder !== "independent") {
        if ((l.flags & 128) !== 0) return l;
      } else if (l.child !== null) {
        l.child.return = l, l = l.child;
        continue;
      }
      if (l === t) break;
      for (; l.sibling === null; ) {
        if (l.return === null || l.return === t) return null;
        l = l.return;
      }
      l.sibling.return = l.return, l = l.sibling;
    }
    return null;
  }
  var Se = 0, P = null, Ht = null, $t = null, ku = !1, Za = !1, ga = !1, Fu = 0, Gn = 0, Va = null, Qv = 0;
  function Vt() {
    throw Error(s(321));
  }
  function Zc(t, l) {
    if (l === null) return !1;
    for (var e = 0; e < l.length && e < t.length; e++)
      if (!xl(t[e], l[e])) return !1;
    return !0;
  }
  function Vc(t, l, e, a, n, u) {
    return Se = u, P = l, l.memoizedState = null, l.updateQueue = null, l.lanes = 0, C.H = t === null || t.memoizedState === null ? Xr : Qr, ga = !1, u = e(a, n), ga = !1, Za && (u = ir(
      l,
      e,
      a,
      n
    )), ur(t), u;
  }
  function ur(t) {
    C.H = ai;
    var l = Ht !== null && Ht.next !== null;
    if (Se = 0, $t = Ht = P = null, ku = !1, Gn = 0, Va = null, l) throw Error(s(300));
    t === null || kt || (t = t.dependencies, t !== null && Gu(t) && (kt = !0));
  }
  function ir(t, l, e, a) {
    P = t;
    var n = 0;
    do {
      if (Za && (Va = null), Gn = 0, Za = !1, 25 <= n) throw Error(s(301));
      if (n += 1, $t = Ht = null, t.updateQueue != null) {
        var u = t.updateQueue;
        u.lastEffect = null, u.events = null, u.stores = null, u.memoCache != null && (u.memoCache.index = 0);
      }
      C.H = Fv, u = l(e, a);
    } while (Za);
    return u;
  }
  function Zv() {
    var t = C.H, l = t.useState()[0];
    return l = typeof l.then == "function" ? Xn(l) : l, t = t.useState()[0], (Ht !== null ? Ht.memoizedState : null) !== t && (P.flags |= 1024), l;
  }
  function Lc() {
    var t = Fu !== 0;
    return Fu = 0, t;
  }
  function Kc(t, l, e) {
    l.updateQueue = t.updateQueue, l.flags &= -2053, t.lanes &= ~e;
  }
  function Jc(t) {
    if (ku) {
      for (t = t.memoizedState; t !== null; ) {
        var l = t.queue;
        l !== null && (l.pending = null), t = t.next;
      }
      ku = !1;
    }
    Se = 0, $t = Ht = P = null, Za = !1, Gn = Fu = 0, Va = null;
  }
  function gl() {
    var t = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return $t === null ? P.memoizedState = $t = t : $t = $t.next = t, $t;
  }
  function Kt() {
    if (Ht === null) {
      var t = P.alternate;
      t = t !== null ? t.memoizedState : null;
    } else t = Ht.next;
    var l = $t === null ? P.memoizedState : $t.next;
    if (l !== null)
      $t = l, Ht = t;
    else {
      if (t === null)
        throw P.alternate === null ? Error(s(467)) : Error(s(310));
      Ht = t, t = {
        memoizedState: Ht.memoizedState,
        baseState: Ht.baseState,
        baseQueue: Ht.baseQueue,
        queue: Ht.queue,
        next: null
      }, $t === null ? P.memoizedState = $t = t : $t = $t.next = t;
    }
    return $t;
  }
  function Wu() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Xn(t) {
    var l = Gn;
    return Gn += 1, Va === null && (Va = []), t = Fo(Va, t, l), l = P, ($t === null ? l.memoizedState : $t.next) === null && (l = l.alternate, C.H = l === null || l.memoizedState === null ? Xr : Qr), t;
  }
  function Iu(t) {
    if (t !== null && typeof t == "object") {
      if (typeof t.then == "function") return Xn(t);
      if (t.$$typeof === S) return;
      if (t.$$typeof === Mt) return cl(t);
    }
    throw Error(s(438, String(t)));
  }
  function $c(t) {
    var l = null, e = P.updateQueue;
    if (e !== null && (l = e.memoCache), l == null) {
      var a = P.alternate;
      a !== null && (a = a.updateQueue, a !== null && (a = a.memoCache, a != null && (l = {
        data: a.data.map(function(n) {
          return n.slice();
        }),
        index: 0
      })));
    }
    if (l == null && (l = { data: [], index: 0 }), e === null && (e = Wu(), P.updateQueue = e), e.memoCache = l, e = l.data[l.index], e === void 0)
      for (e = l.data[l.index] = Array(t), a = 0; a < t; a++)
        e[a] = Zt;
    return l.index++, e;
  }
  function pe(t, l) {
    return typeof l == "function" ? l(t) : l;
  }
  function Pu(t) {
    var l = Kt();
    return kc(l, Ht, t);
  }
  function kc(t, l, e) {
    var a = t.queue;
    if (a === null) throw Error(s(311));
    a.lastRenderedReducer = e;
    var n = t.baseQueue, u = a.pending;
    if (u !== null) {
      if (n !== null) {
        var i = n.next;
        n.next = u.next, u.next = i;
      }
      l.baseQueue = n = u, a.pending = null;
    }
    if (u = t.baseState, n === null) t.memoizedState = u;
    else {
      l = n.next;
      var c = i = null, f = null, v = l, y = !1;
      do {
        var _ = v.lane & -536870913;
        if (_ !== v.lane ? (ot & _) === _ : (Se & _) === _) {
          var d = v.revertLane;
          if (d === 0)
            f !== null && (f = f.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }), _ === ra && (y = !0);
          else if ((Se & d) === d) {
            v = v.next, d === ra && (y = !0);
            continue;
          } else
            _ = {
              lane: 0,
              revertLane: v.revertLane,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }, f === null ? (c = f = _, i = u) : f = f.next = _, P.lanes |= d, Ve |= d;
          _ = v.action, ga && e(u, _), u = v.hasEagerState ? v.eagerState : e(u, _);
        } else
          d = {
            lane: _,
            revertLane: v.revertLane,
            gesture: v.gesture,
            action: v.action,
            hasEagerState: v.hasEagerState,
            eagerState: v.eagerState,
            next: null
          }, f === null ? (c = f = d, i = u) : f = f.next = d, P.lanes |= _, Ve |= _;
        v = v.next;
      } while (v !== null && v !== l);
      if (f === null ? i = u : f.next = c, !xl(u, t.memoizedState) && (kt = !0, y && (e = Ga, e !== null)))
        throw e;
      t.memoizedState = u, t.baseState = i, t.baseQueue = f, a.lastRenderedState = u;
    }
    return n === null && (a.lanes = 0), [t.memoizedState, a.dispatch];
  }
  function Fc(t) {
    var l = Kt(), e = l.queue;
    if (e === null) throw Error(s(311));
    e.lastRenderedReducer = t;
    var a = e.dispatch, n = e.pending, u = l.memoizedState;
    if (n !== null) {
      e.pending = null;
      var i = n = n.next;
      do
        u = t(u, i.action), i = i.next;
      while (i !== n);
      xl(u, l.memoizedState) || (kt = !0), l.memoizedState = u, l.baseQueue === null && (l.baseState = u), e.lastRenderedState = u;
    }
    return [u, a];
  }
  function cr(t, l, e) {
    var a = P, n = Kt(), u = et;
    if (u) {
      if (e === void 0) throw Error(s(407));
      e = e();
    } else e = l();
    var i = !xl(
      (Ht || n).memoizedState,
      e
    );
    if (i && (n.memoizedState = e, kt = !0), n = n.queue, Pc(or.bind(null, a, n, t), [
      t
    ]), t = n.getSnapshot !== l || i || $t !== null && ($t.memoizedState.tag & 1) !== 0, La(
      t ? 9 : 8,
      { destroy: void 0 },
      sr.bind(null, a, n, e, l),
      null
    ), t) {
      if (a.flags |= 2048, qt === null) throw Error(s(349));
      u || (Se & 127) !== 0 || fr(a, l, e);
    }
    return e;
  }
  function fr(t, l, e) {
    t.flags |= 16384, t = { getSnapshot: l, value: e }, l = P.updateQueue, l === null ? (l = Wu(), P.updateQueue = l, l.stores = [t]) : (e = l.stores, e === null ? l.stores = [t] : e.push(t));
  }
  function sr(t, l, e, a) {
    l.value = e, l.getSnapshot = a, rr(l) && dr(t);
  }
  function or(t, l, e) {
    return e(function() {
      rr(l) && dr(t);
    });
  }
  function rr(t) {
    var l = t.getSnapshot;
    t = t.value;
    try {
      var e = l();
      return !xl(t, e);
    } catch {
      return !0;
    }
  }
  function dr(t) {
    var l = ua(t, 2);
    l !== null && zl(l, t, 2);
  }
  function Wc(t) {
    var l = gl();
    if (typeof t == "function") {
      var e = t;
      if (t = e(), ga) {
        Ae(!0);
        try {
          e();
        } finally {
          Ae(!1);
        }
      }
    }
    return l.memoizedState = l.baseState = t, l.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: pe,
      lastRenderedState: t
    }, l;
  }
  function hr(t, l, e, a) {
    return t.baseState = e, kc(
      t,
      Ht,
      typeof a == "function" ? a : pe
    );
  }
  function Vv(t, l, e, a, n) {
    if (ei(t)) throw Error(s(485));
    if (t = l.action, t !== null) {
      var u = {
        payload: n,
        action: t,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(i) {
          u.listeners.push(i);
        }
      };
      C.T !== null ? e(!0) : u.isTransition = !1, a(u), e = l.pending, e === null ? (u.next = l.pending = u, vr(l, u)) : (u.next = e.next, l.pending = e.next = u);
    }
  }
  function vr(t, l) {
    var e = l.action, a = l.payload, n = t.state;
    if (l.isTransition) {
      var u = C.T, i = {};
      i.types = u !== null ? u.types : null, C.T = i;
      try {
        var c = e(n, a), f = C.S;
        f !== null && f(i, c), mr(t, l, c);
      } catch (v) {
        Ic(t, l, v);
      } finally {
        u !== null && i.types !== null && (u.types = i.types), C.T = u;
      }
    } else
      try {
        u = e(n, a), mr(t, l, u);
      } catch (v) {
        Ic(t, l, v);
      }
  }
  function mr(t, l, e) {
    e !== null && typeof e == "object" && typeof e.then == "function" ? e.then(
      function(a) {
        gr(t, l, a);
      },
      function(a) {
        return Ic(t, l, a);
      }
    ) : gr(t, l, e);
  }
  function gr(t, l, e) {
    l.status = "fulfilled", l.value = e, yr(l), t.state = e, l = t.pending, l !== null && (e = l.next, e === l ? t.pending = null : (e = e.next, l.next = e, vr(t, e)));
  }
  function Ic(t, l, e) {
    var a = t.pending;
    if (t.pending = null, a !== null) {
      a = a.next;
      do
        l.status = "rejected", l.reason = e, yr(l), l = l.next;
      while (l !== a);
    }
    t.action = null;
  }
  function yr(t) {
    t = t.listeners;
    for (var l = 0; l < t.length; l++) (0, t[l])();
  }
  function br(t, l) {
    return l;
  }
  function Sr(t, l) {
    if (et) {
      var e = qt.formState;
      if (e !== null) {
        t: {
          var a = P;
          if (et) {
            if (Yt) {
              l: {
                for (var n = Yt, u = Ql; n.nodeType !== 8; ) {
                  if (!u) {
                    n = null;
                    break l;
                  }
                  if (n = Vl(
                    n.nextSibling
                  ), n === null) {
                    n = null;
                    break l;
                  }
                }
                u = n.data, n = u === "F!" || u === "F" ? n : null;
              }
              if (n) {
                Yt = Vl(
                  n.nextSibling
                ), a = n.data === "F!";
                break t;
              }
            }
            Ue(a);
          }
          a = !1;
        }
        a && (l = e[0]);
      }
    }
    return e = gl(), e.memoizedState = e.baseState = l, a = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: br,
      lastRenderedState: l
    }, e.queue = a, e = Yr.bind(
      null,
      P,
      a
    ), a.dispatch = e, a = Wc(!1), u = nf.bind(
      null,
      P,
      !1,
      a.queue
    ), a = gl(), n = {
      state: l,
      dispatch: null,
      action: t,
      pending: null
    }, a.queue = n, e = Vv.bind(
      null,
      P,
      n,
      u,
      e
    ), n.dispatch = e, a.memoizedState = t, [l, e, !1];
  }
  function pr(t) {
    var l = Kt();
    return Tr(l, Ht, t);
  }
  function Tr(t, l, e) {
    if (l = kc(
      t,
      l,
      br
    )[0], t = Pu(pe)[0], typeof l == "object" && l !== null && typeof l.then == "function")
      try {
        var a = Xn(l);
      } catch (i) {
        throw i === Xa ? Zu : i;
      }
    else a = l;
    l = Kt();
    var n = l.queue, u = n.dispatch;
    return e !== l.memoizedState && (P.flags |= 2048, La(
      9,
      { destroy: void 0 },
      Lv.bind(null, n, e),
      null
    )), [a, u, t];
  }
  function Lv(t, l) {
    t.action = l;
  }
  function Er(t) {
    var l = Kt(), e = Ht;
    if (e !== null)
      return Tr(l, e, t);
    Kt(), l = l.memoizedState, e = Kt();
    var a = e.queue.dispatch;
    return e.memoizedState = t, [l, a, !1];
  }
  function La(t, l, e, a) {
    return t = { tag: t, create: e, deps: a, inst: l, next: null }, l = P.updateQueue, l === null && (l = Wu(), P.updateQueue = l), e = l.lastEffect, e === null ? l.lastEffect = t.next = t : (a = e.next, e.next = t, t.next = a, l.lastEffect = t), t;
  }
  function _r() {
    return Kt().memoizedState;
  }
  function ti(t, l, e, a) {
    var n = gl();
    P.flags |= t, n.memoizedState = La(
      1 | l,
      { destroy: void 0 },
      e,
      a === void 0 ? null : a
    );
  }
  function li(t, l, e, a) {
    var n = Kt();
    a = a === void 0 ? null : a;
    var u = n.memoizedState.inst;
    Ht !== null && a !== null && Zc(a, Ht.memoizedState.deps) ? n.memoizedState = La(l, u, e, a) : (P.flags |= t, n.memoizedState = La(
      1 | l,
      u,
      e,
      a
    ));
  }
  function zr(t, l) {
    ti(8390656, 8, t, l);
  }
  function Pc(t, l) {
    li(2048, 8, t, l);
  }
  function Kv(t) {
    P.flags |= 4;
    var l = P.updateQueue;
    if (l === null)
      l = Wu(), P.updateQueue = l, l.events = [t];
    else {
      var e = l.events;
      e === null ? l.events = [t] : e.push(t);
    }
  }
  function Nr(t) {
    var l = Kt().memoizedState;
    return Kv({ ref: l, nextImpl: t }), function() {
      if ((_t & 2) !== 0) throw Error(s(440));
      return l.impl.apply(void 0, arguments);
    };
  }
  function Or(t, l) {
    return li(4, 2, t, l);
  }
  function Ar(t, l) {
    return li(4, 4, t, l);
  }
  function Mr(t, l) {
    if (typeof l == "function") {
      t = t();
      var e = l(t);
      return function() {
        typeof e == "function" ? e() : l(null);
      };
    }
    if (l != null)
      return t = t(), l.current = t, function() {
        l.current = null;
      };
  }
  function xr(t, l, e) {
    e = e != null ? e.concat([t]) : null, li(4, 4, Mr.bind(null, l, t), e);
  }
  function tf() {
  }
  function Dr(t, l) {
    var e = Kt();
    l = l === void 0 ? null : l;
    var a = e.memoizedState;
    return l !== null && Zc(l, a[1]) ? a[0] : (e.memoizedState = [t, l], t);
  }
  function Rr(t, l) {
    var e = Kt();
    l = l === void 0 ? null : l;
    var a = e.memoizedState;
    if (l !== null && Zc(l, a[1]))
      return a[0];
    if (a = t(), ga) {
      Ae(!0);
      try {
        t();
      } finally {
        Ae(!1);
      }
    }
    return e.memoizedState = [a, l], a;
  }
  function lf(t, l, e) {
    return e === void 0 || (Se & 1073741824) !== 0 && (ot & 261930) === 0 ? t.memoizedState = l : (t.memoizedState = e, t = X0(), P.lanes |= t, Ve |= t, e);
  }
  function Ur(t, l, e, a) {
    return xl(e, l) ? e : Ye.current !== null ? (t = lf(t, e, a), xl(t, l) || (kt = !0), t) : (Se & 106) === 0 || (Se & 1073741824) !== 0 && (ot & 261930) === 0 ? (kt = !0, t.memoizedState = e) : (t = X0(), P.lanes |= t, Ve |= t, l);
  }
  function Cr(t, l, e, a, n) {
    var u = z.p;
    z.p = u !== 0 && 8 > u ? u : 8;
    var i = C.T, c = {};
    c.types = i !== null ? i.types : null, C.T = c, nf(t, !1, l, e);
    try {
      var f = n(), v = C.S;
      if (v !== null && v(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var y = Xv(
          f,
          a
        );
        Qn(
          t,
          l,
          y,
          Hl(t)
        );
      } else
        Qn(
          t,
          l,
          a,
          Hl(t)
        );
    } catch (_) {
      Qn(
        t,
        l,
        { then: function() {
        }, status: "rejected", reason: _ },
        Hl()
      );
    } finally {
      z.p = u, i !== null && c.types !== null && (i.types = c.types), C.T = i;
    }
  }
  function Jv() {
  }
  function ef(t, l, e, a) {
    if (t.tag !== 5) throw Error(s(476));
    var n = Hr(t).queue;
    Cr(
      t,
      n,
      l,
      Q,
      e === null ? Jv : function() {
        return jr(t), e(a);
      }
    );
  }
  function Hr(t) {
    var l = t.memoizedState;
    if (l !== null) return l;
    l = {
      memoizedState: Q,
      baseState: Q,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: pe,
        lastRenderedState: Q
      },
      next: null
    };
    var e = {};
    return l.next = {
      memoizedState: e,
      baseState: e,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: pe,
        lastRenderedState: e
      },
      next: null
    }, t.memoizedState = l, t = t.alternate, t !== null && (t.memoizedState = l), l;
  }
  function jr(t) {
    var l = Hr(t);
    l.next === null && (l = t.alternate.memoizedState), Qn(
      t,
      l.next.queue,
      {},
      Hl()
    );
  }
  function af() {
    return cl(rn);
  }
  function qr() {
    return Kt().memoizedState;
  }
  function Br() {
    return Kt().memoizedState;
  }
  function $v(t) {
    for (var l = t.return; l !== null; ) {
      switch (l.tag) {
        case 24:
        case 3:
          var e = Hl();
          t = qe(e);
          var a = Be(l, t, e);
          a !== null && (zl(a, l, e), qn(a, l, e)), l = { cache: Rc() }, t.payload = l;
          return;
      }
      l = l.return;
    }
  }
  function kv(t, l, e) {
    var a = Hl();
    e = {
      lane: a,
      revertLane: 0,
      gesture: null,
      action: e,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ei(t) ? wr(l, e) : (e = Ec(t, l, e, a), e !== null && (zl(e, t, a), Gr(e, l, a)));
  }
  function Yr(t, l, e) {
    var a = Hl();
    Qn(t, l, e, a);
  }
  function Qn(t, l, e, a) {
    var n = {
      lane: a,
      revertLane: 0,
      gesture: null,
      action: e,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (ei(t)) wr(l, n);
    else {
      var u = t.alternate;
      if (t.lanes === 0 && (u === null || u.lanes === 0) && (u = l.lastRenderedReducer, u !== null))
        try {
          var i = l.lastRenderedState, c = u(i, e);
          if (n.hasEagerState = !0, n.eagerState = c, xl(c, i))
            return Cu(t, l, n, 0), qt === null && Uu(), !1;
        } catch {
        } finally {
        }
      if (e = Ec(t, l, n, a), e !== null)
        return zl(e, t, a), Gr(e, l, a), !0;
    }
    return !1;
  }
  function nf(t, l, e, a) {
    if (a = {
      lane: 2,
      revertLane: kf(),
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ei(t)) {
      if (l) throw Error(s(479));
    } else
      l = Ec(
        t,
        e,
        a,
        2
      ), l !== null && zl(l, t, 2);
  }
  function ei(t) {
    var l = t.alternate;
    return t === P || l !== null && l === P;
  }
  function wr(t, l) {
    Za = ku = !0;
    var e = t.pending;
    e === null ? l.next = l : (l.next = e.next, e.next = l), t.pending = l;
  }
  function Gr(t, l, e) {
    if ((e & 4194048) !== 0) {
      var a = l.lanes;
      a &= t.pendingLanes, e |= a, l.lanes = e, Gs(t, e);
    }
  }
  var ai = {
    readContext: cl,
    use: Iu,
    useCallback: Vt,
    useContext: Vt,
    useEffect: Vt,
    useImperativeHandle: Vt,
    useLayoutEffect: Vt,
    useInsertionEffect: Vt,
    useMemo: Vt,
    useReducer: Vt,
    useRef: Vt,
    useState: Vt,
    useDebugValue: Vt,
    useDeferredValue: Vt,
    useTransition: Vt,
    useSyncExternalStore: Vt,
    useId: Vt,
    useHostTransitionStatus: Vt,
    useFormState: Vt,
    useActionState: Vt,
    useOptimistic: Vt,
    useMemoCache: Vt,
    useCacheRefresh: Vt,
    useEffectEvent: Vt
  }, Xr = {
    readContext: cl,
    use: Iu,
    useCallback: function(t, l) {
      return gl().memoizedState = [
        t,
        l === void 0 ? null : l
      ], t;
    },
    useContext: cl,
    useEffect: zr,
    useImperativeHandle: function(t, l, e) {
      e = e != null ? e.concat([t]) : null, ti(
        4194308,
        4,
        Mr.bind(null, l, t),
        e
      );
    },
    useLayoutEffect: function(t, l) {
      return ti(4194308, 4, t, l);
    },
    useInsertionEffect: function(t, l) {
      ti(4, 2, t, l);
    },
    useMemo: function(t, l) {
      var e = gl();
      l = l === void 0 ? null : l;
      var a = t();
      if (ga) {
        Ae(!0);
        try {
          t();
        } finally {
          Ae(!1);
        }
      }
      return e.memoizedState = [a, l], a;
    },
    useReducer: function(t, l, e) {
      var a = gl();
      if (e !== void 0) {
        var n = e(l);
        if (ga) {
          Ae(!0);
          try {
            e(l);
          } finally {
            Ae(!1);
          }
        }
      } else n = l;
      return a.memoizedState = a.baseState = n, t = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: t,
        lastRenderedState: n
      }, a.queue = t, t = t.dispatch = kv.bind(
        null,
        P,
        t
      ), [a.memoizedState, t];
    },
    useRef: function(t) {
      var l = gl();
      return t = { current: t }, l.memoizedState = t;
    },
    useState: function(t) {
      t = Wc(t);
      var l = t.queue, e = Yr.bind(null, P, l);
      return l.dispatch = e, [t.memoizedState, e];
    },
    useDebugValue: tf,
    useDeferredValue: function(t, l) {
      var e = gl();
      return lf(e, t, l);
    },
    useTransition: function() {
      var t = Wc(!1);
      return t = Cr.bind(
        null,
        P,
        t.queue,
        !0,
        !1
      ), gl().memoizedState = t, [!1, t];
    },
    useSyncExternalStore: function(t, l, e) {
      var a = P, n = gl();
      if (et) {
        if (e === void 0)
          throw Error(s(407));
        e = e();
      } else {
        if (e = l(), qt === null)
          throw Error(s(349));
        (ot & 127) !== 0 || fr(a, l, e);
      }
      n.memoizedState = e;
      var u = { value: e, getSnapshot: l };
      return n.queue = u, zr(or.bind(null, a, u, t), [
        t
      ]), a.flags |= 2048, La(
        9,
        { destroy: void 0 },
        sr.bind(
          null,
          a,
          u,
          e,
          l
        ),
        null
      ), e;
    },
    useId: function() {
      var t = gl(), l = qt.identifierPrefix;
      if (et) {
        var e = le, a = te;
        e = (a & ~(1 << 32 - Al(a) - 1)).toString(32) + e, l = "_" + l + "R_" + e, e = Fu++, 0 < e && (l += "H" + e.toString(32)), l += "_";
      } else
        e = Qv++, l = "_" + l + "r_" + e.toString(32) + "_";
      return t.memoizedState = l;
    },
    useHostTransitionStatus: af,
    useFormState: Sr,
    useActionState: Sr,
    useOptimistic: function(t) {
      var l = gl();
      l.memoizedState = l.baseState = t;
      var e = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return l.queue = e, l = nf.bind(
        null,
        P,
        !0,
        e
      ), e.dispatch = l, [t, l];
    },
    useMemoCache: $c,
    useCacheRefresh: function() {
      return gl().memoizedState = $v.bind(
        null,
        P
      );
    },
    useEffectEvent: function(t) {
      var l = gl(), e = { impl: t };
      return l.memoizedState = e, function() {
        if ((_t & 2) !== 0)
          throw Error(s(440));
        return e.impl.apply(void 0, arguments);
      };
    }
  }, Qr = {
    readContext: cl,
    use: Iu,
    useCallback: Dr,
    useContext: cl,
    useEffect: Pc,
    useImperativeHandle: xr,
    useInsertionEffect: Or,
    useLayoutEffect: Ar,
    useMemo: Rr,
    useReducer: Pu,
    useRef: _r,
    useState: function() {
      return Pu(pe);
    },
    useDebugValue: tf,
    useDeferredValue: function(t, l) {
      var e = Kt();
      return Ur(
        e,
        Ht.memoizedState,
        t,
        l
      );
    },
    useTransition: function() {
      var t = Pu(pe)[0], l = Kt().memoizedState;
      return [
        typeof t == "boolean" ? t : Xn(t),
        l
      ];
    },
    useSyncExternalStore: cr,
    useId: qr,
    useHostTransitionStatus: af,
    useFormState: pr,
    useActionState: pr,
    useOptimistic: function(t, l) {
      var e = Kt();
      return hr(e, Ht, t, l);
    },
    useMemoCache: $c,
    useCacheRefresh: Br,
    useEffectEvent: Nr
  }, Fv = {
    readContext: cl,
    use: Iu,
    useCallback: Dr,
    useContext: cl,
    useEffect: Pc,
    useImperativeHandle: xr,
    useInsertionEffect: Or,
    useLayoutEffect: Ar,
    useMemo: Rr,
    useReducer: Fc,
    useRef: _r,
    useState: function() {
      return Fc(pe);
    },
    useDebugValue: tf,
    useDeferredValue: function(t, l) {
      var e = Kt();
      return Ht === null ? lf(e, t, l) : Ur(
        e,
        Ht.memoizedState,
        t,
        l
      );
    },
    useTransition: function() {
      var t = Fc(pe)[0], l = Kt().memoizedState;
      return [
        typeof t == "boolean" ? t : Xn(t),
        l
      ];
    },
    useSyncExternalStore: cr,
    useId: qr,
    useHostTransitionStatus: af,
    useFormState: Er,
    useActionState: Er,
    useOptimistic: function(t, l) {
      var e = Kt();
      return Ht !== null ? hr(e, Ht, t, l) : (e.baseState = t, [t, e.queue.dispatch]);
    },
    useMemoCache: $c,
    useCacheRefresh: Br,
    useEffectEvent: Nr
  };
  function uf(t, l, e, a) {
    l = t.memoizedState, e = e(a, l), e = e == null ? l : G({}, l, e), t.memoizedState = e, t.lanes === 0 && (t.updateQueue.baseState = e);
  }
  var cf = {
    enqueueSetState: function(t, l, e) {
      t = t._reactInternals;
      var a = Hl(), n = qe(a);
      n.payload = l, e != null && (n.callback = e), l = Be(t, n, a), l !== null && (zl(l, t, a), qn(l, t, a));
    },
    enqueueReplaceState: function(t, l, e) {
      t = t._reactInternals;
      var a = Hl(), n = qe(a);
      n.tag = 1, n.payload = l, e != null && (n.callback = e), l = Be(t, n, a), l !== null && (zl(l, t, a), qn(l, t, a));
    },
    enqueueForceUpdate: function(t, l) {
      t = t._reactInternals;
      var e = Hl(), a = qe(e);
      a.tag = 2, l != null && (a.callback = l), l = Be(t, a, e), l !== null && (zl(l, t, e), qn(l, t, e));
    }
  };
  function Zr(t, l, e, a, n, u, i) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(a, u, i) : l.prototype && l.prototype.isPureReactComponent ? !Mn(e, a) || !Mn(n, u) : !0;
  }
  function Vr(t, l, e, a) {
    t = l.state, typeof l.componentWillReceiveProps == "function" && l.componentWillReceiveProps(e, a), typeof l.UNSAFE_componentWillReceiveProps == "function" && l.UNSAFE_componentWillReceiveProps(e, a), l.state !== t && cf.enqueueReplaceState(l, l.state, null);
  }
  function ya(t, l) {
    var e = l;
    if ("ref" in l) {
      e = {};
      for (var a in l)
        a !== "ref" && (e[a] = l[a]);
    }
    if (t = t.defaultProps) {
      e === l && (e = G({}, e));
      for (var n in t)
        e[n] === void 0 && (e[n] = t[n]);
    }
    return e;
  }
  function Lr(t) {
    Ru(t);
  }
  function Kr(t) {
    console.error(t);
  }
  function Jr(t) {
    Ru(t);
  }
  function ni(t, l) {
    try {
      var e = t.onUncaughtError;
      e(l.value, { componentStack: l.stack });
    } catch (a) {
      setTimeout(function() {
        throw a;
      });
    }
  }
  function $r(t, l, e) {
    try {
      var a = t.onCaughtError;
      a(e.value, {
        componentStack: e.stack,
        errorBoundary: l.tag === 1 ? l.stateNode : null
      });
    } catch (n) {
      setTimeout(function() {
        throw n;
      });
    }
  }
  function ff(t, l, e) {
    return e = qe(e), e.tag = 3, e.payload = { element: null }, e.callback = function() {
      ni(t, l);
    }, e;
  }
  function kr(t) {
    return t = qe(t), t.tag = 3, t;
  }
  function Fr(t, l, e, a) {
    var n = e.type.getDerivedStateFromError;
    if (typeof n == "function") {
      var u = a.value;
      t.payload = function() {
        return n(u);
      }, t.callback = function() {
        $r(l, e, a);
      };
    }
    var i = e.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (t.callback = function() {
      $r(l, e, a), typeof n != "function" && (Le === null ? Le = /* @__PURE__ */ new Set([this]) : Le.add(this));
      var c = a.stack;
      this.componentDidCatch(a.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function Wv(t, l, e, a, n) {
    if (e.flags |= 32768, a !== null && typeof a == "object" && typeof a.then == "function") {
      if (l = e.alternate, l !== null && sa(
        l,
        e,
        n,
        !0
      ), e = fl.current, e !== null) {
        switch (e.tag) {
          case 31:
          case 13:
          case 19:
            return hl === null ? Ni() : e.alternate === null && Lt === 0 && (Lt = 3), e.flags &= -257, e.flags |= 65536, e.lanes = n, a === Vu ? e.flags |= 16384 : (l = e.updateQueue, l === null ? e.updateQueue = /* @__PURE__ */ new Set([a]) : l.add(a), Kf(t, a, n)), !1;
          case 22:
            return e.flags |= 65536, a === Vu ? e.flags |= 16384 : (l = e.updateQueue, l === null ? (l = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([a])
            }, e.updateQueue = l) : (e = l.retryQueue, e === null ? l.retryQueue = /* @__PURE__ */ new Set([a]) : e.add(a)), Kf(t, a, n)), !1;
        }
        throw Error(s(435, e.tag));
      }
      return Kf(t, a, n), Ni(), !1;
    }
    if (et)
      return l = fl.current, l !== null ? ((l.flags & 65536) === 0 && (l.flags |= 256), l.flags |= 65536, l.lanes = n, a !== Ac && (t = Error(s(422), { cause: a }), Rn(wl(t, e)))) : (a !== Ac && (l = Error(s(423), {
        cause: a
      }), Rn(
        wl(l, e)
      )), t = t.current.alternate, t.flags |= 65536, n &= -n, t.lanes |= n, a = wl(a, e), n = ff(
        t.stateNode,
        a,
        n
      ), Bc(t, n), Lt !== 4 && (Lt = 2)), !1;
    var u = Error(s(520), { cause: a });
    if (u = wl(u, e), Fn === null ? Fn = [u] : Fn.push(u), Lt !== 4 && (Lt = 2), l === null) return !0;
    a = wl(a, e), e = l;
    do {
      switch (e.tag) {
        case 3:
          return e.flags |= 65536, t = n & -n, e.lanes |= t, t = ff(e.stateNode, a, t), Bc(e, t), !1;
        case 1:
          if (l = e.type, u = e.stateNode, (e.flags & 128) === 0 && (typeof l.getDerivedStateFromError == "function" || u !== null && typeof u.componentDidCatch == "function" && (Le === null || !Le.has(u))))
            return e.flags |= 65536, n &= -n, e.lanes |= n, n = kr(n), Fr(
              n,
              t,
              e,
              a
            ), Bc(e, n), !1;
          break;
        case 22:
          if (e.memoizedState !== null)
            return e.flags |= 65536, !1;
      }
      e = e.return;
    } while (e !== null);
    return !1;
  }
  var sf = Error(s(461)), kt = !1;
  function It(t, l, e, a) {
    l.child = t === null ? tr(l, null, e, a) : ma(
      l,
      t.child,
      e,
      a
    );
  }
  function Wr(t, l, e, a, n) {
    e = e.render;
    var u = l.ref;
    if ("ref" in a) {
      var i = {};
      for (var c in a)
        c !== "ref" && (i[c] = a[c]);
    } else i = a;
    return oa(l), a = Vc(
      t,
      l,
      e,
      i,
      u,
      n
    ), c = Lc(), t !== null && !kt ? (Kc(t, l, n), Te(t, l, n)) : (et && c && Bu(l), l.flags |= 1, It(t, l, a, n), l.child);
  }
  function Ir(t, l, e, a, n) {
    if (t === null) {
      var u = e.type;
      return typeof u == "function" && !_c(u) && u.defaultProps === void 0 && e.compare === null ? (l.tag = 15, l.type = u, Pr(
        t,
        l,
        u,
        a,
        n
      )) : (t = ju(
        e.type,
        null,
        a,
        l,
        l.mode,
        n
      ), t.ref = l.ref, t.return = l, l.child = t);
    }
    if (u = t.child, !yf(t, n)) {
      var i = u.memoizedProps;
      if (e = e.compare, e = e !== null ? e : Mn, e(i, a) && t.ref === l.ref)
        return Te(t, l, n);
    }
    return l.flags |= 1, t = me(u, a), t.ref = l.ref, t.return = l, l.child = t;
  }
  function Pr(t, l, e, a, n) {
    if (t !== null) {
      var u = t.memoizedProps;
      if (Mn(u, a) && t.ref === l.ref)
        if (kt = !1, l.pendingProps = a = u, yf(t, n))
          (t.flags & 131072) !== 0 && (kt = !0);
        else
          return l.lanes = t.lanes, Te(t, l, n);
    }
    return of(
      t,
      l,
      e,
      a,
      n
    );
  }
  function t0(t, l, e, a) {
    var n = a.children, u = t !== null ? t.memoizedState : null;
    if (t === null && l.stateNode === null && (l.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), a.mode === "hidden") {
      if ((l.flags & 128) !== 0) {
        if (u = u !== null ? u.baseLanes | e : e, t !== null) {
          for (a = l.child = t.child, n = 0; a !== null; )
            n = n | a.lanes | a.childLanes, a = a.sibling;
          a = n & ~u;
        } else a = 0, l.child = null;
        return l0(
          t,
          l,
          u,
          e,
          a
        );
      }
      if ((e & 536870912) !== 0)
        l.memoizedState = { baseLanes: 0, cachePool: null }, t !== null && Qu(
          l,
          u !== null ? u.cachePool : null
        ), u !== null ? ar(l, u) : wc(), nr(l);
      else
        return a = l.lanes = 536870912, l0(
          t,
          l,
          u !== null ? u.baseLanes | e : e,
          e,
          a
        );
    } else
      u !== null ? (Qu(l, u.cachePool), ar(l, u), Ge(), l.memoizedState = null) : (t !== null && Qu(l, null), wc(), Ge());
    return It(t, l, n, e), l.child;
  }
  function Zn(t, l) {
    return t !== null && t.tag === 22 || l.stateNode !== null || (l.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), l.sibling;
  }
  function l0(t, l, e, a, n) {
    var u = Cc();
    return u = u === null ? null : { parent: Jt._currentValue, pool: u }, l.memoizedState = {
      baseLanes: e,
      cachePool: u
    }, t !== null && Qu(l, null), wc(), nr(l), t !== null && sa(t, l, a, !0), l.childLanes = n, null;
  }
  function ui(t, l) {
    return l = ii(
      { mode: l.mode, children: l.children },
      t.mode
    ), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function e0(t, l, e) {
    return ma(l, t.child, null, e), t = ui(l, l.pendingProps), t.flags |= 2, Dl(l), l.memoizedState = null, t;
  }
  function Iv(t, l, e) {
    var a = l.pendingProps, n = (l.flags & 128) !== 0;
    if (l.flags &= -129, t === null) {
      if (et) {
        if (a.mode === "hidden")
          return t = ui(l, a), l.lanes = 536870912, t.memoizedState = { baseLanes: 0, cachePool: null }, Zn(null, t);
        if (Xc(l), (t = Yt) ? (t = Md(
          t,
          Ql
        ), t = t !== null && t.data === "&" ? t : null, t !== null && (l.memoizedState = {
          dehydrated: t,
          treeContext: De !== null ? { id: te, overflow: le } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, e = wo(t), e.return = l, l.child = e, ll = l, Yt = null)) : t = null, t === null) throw Ue(l);
        return l.lanes = 536870912, null;
      }
      return ui(l, a);
    }
    var u = t.memoizedState;
    if (u !== null) {
      var i = u.dehydrated;
      if (Xc(l), n)
        if (l.flags & 256)
          l.flags &= -257, l = e0(
            t,
            l,
            e
          );
        else if (l.memoizedState !== null)
          l.child = t.child, l.flags |= 128, l = null;
        else throw Error(s(558));
      else if (kt || sa(t, l, e, !1), n = (e & t.childLanes) !== 0, kt || n) {
        if (Ye.current === null) {
          if (a = qt, a !== null && (i = Xs(a, e), i !== 0 && i !== u.retryLane))
            throw u.retryLane = i, ua(t, i), zl(a, t, i), sf;
          Ni();
        }
        l = e0(
          t,
          l,
          e
        );
      } else
        t = u.treeContext, Yt = Vl(i.nextSibling), ll = l, et = !0, Re = null, Ql = !1, t !== null && Qo(l, t), l = ui(l, a), l.flags |= 134221824;
      return l;
    }
    return t = me(t.child, {
      mode: a.mode,
      children: a.children
    }), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function Ka(t, l) {
    var e = l.ref;
    if (e === null)
      t !== null && t.ref !== null && (l.flags |= 4194816);
    else {
      if (typeof e != "function" && typeof e != "object")
        throw Error(s(284));
      (t === null || t.ref !== e) && (l.flags |= 4194816);
    }
  }
  function of(t, l, e, a, n) {
    return oa(l), e = Vc(
      t,
      l,
      e,
      a,
      void 0,
      n
    ), a = Lc(), t !== null && !kt ? (Kc(t, l, n), Te(t, l, n)) : (et && a && Bu(l), l.flags |= 1, It(t, l, e, n), l.child);
  }
  function a0(t, l, e, a, n, u) {
    return oa(l), l.updateQueue = null, e = ir(
      l,
      a,
      e,
      n
    ), ur(t), a = Lc(), t !== null && !kt ? (Kc(t, l, u), Te(t, l, u)) : (et && a && Bu(l), l.flags |= 1, It(t, l, e, u), l.child);
  }
  function n0(t, l, e, a, n) {
    if (oa(l), l.stateNode === null) {
      var u = qa, i = e.contextType;
      typeof i == "object" && i !== null && (u = cl(i)), u = new e(a, u), l.memoizedState = u.state !== null && u.state !== void 0 ? u.state : null, u.updater = cf, l.stateNode = u, u._reactInternals = l, u = l.stateNode, u.props = a, u.state = l.memoizedState, u.refs = {}, jc(l), i = e.contextType, u.context = typeof i == "object" && i !== null ? cl(i) : qa, u.state = l.memoizedState, i = e.getDerivedStateFromProps, typeof i == "function" && (uf(
        l,
        e,
        i,
        a
      ), u.state = l.memoizedState), typeof e.getDerivedStateFromProps == "function" || typeof u.getSnapshotBeforeUpdate == "function" || typeof u.UNSAFE_componentWillMount != "function" && typeof u.componentWillMount != "function" || (i = u.state, typeof u.componentWillMount == "function" && u.componentWillMount(), typeof u.UNSAFE_componentWillMount == "function" && u.UNSAFE_componentWillMount(), i !== u.state && cf.enqueueReplaceState(u, u.state, null), Yn(l, a, u, n), Bn(), u.state = l.memoizedState), typeof u.componentDidMount == "function" && (l.flags |= 4194308), a = !0;
    } else if (t === null) {
      u = l.stateNode;
      var c = l.memoizedProps, f = ya(e, c);
      u.props = f;
      var v = u.context, y = e.contextType;
      i = qa, typeof y == "object" && y !== null && (i = cl(y));
      var _ = e.getDerivedStateFromProps;
      y = typeof _ == "function" || typeof u.getSnapshotBeforeUpdate == "function", c = l.pendingProps !== c, y || typeof u.UNSAFE_componentWillReceiveProps != "function" && typeof u.componentWillReceiveProps != "function" || (c || v !== i) && Vr(
        l,
        u,
        a,
        i
      ), je = !1;
      var d = l.memoizedState;
      u.state = d, Yn(l, a, u, n), Bn(), v = l.memoizedState, c || d !== v || je ? (typeof _ == "function" && (uf(
        l,
        e,
        _,
        a
      ), v = l.memoizedState), (f = je || Zr(
        l,
        e,
        f,
        a,
        d,
        v,
        i
      )) ? (y || typeof u.UNSAFE_componentWillMount != "function" && typeof u.componentWillMount != "function" || (typeof u.componentWillMount == "function" && u.componentWillMount(), typeof u.UNSAFE_componentWillMount == "function" && u.UNSAFE_componentWillMount()), typeof u.componentDidMount == "function" && (l.flags |= 4194308)) : (typeof u.componentDidMount == "function" && (l.flags |= 4194308), l.memoizedProps = a, l.memoizedState = v), u.props = a, u.state = v, u.context = i, a = f) : (typeof u.componentDidMount == "function" && (l.flags |= 4194308), a = !1);
    } else {
      u = l.stateNode, qc(t, l), i = l.memoizedProps, y = ya(e, i), u.props = y, _ = l.pendingProps, d = u.context, v = e.contextType, f = qa, typeof v == "object" && v !== null && (f = cl(v)), c = e.getDerivedStateFromProps, (v = typeof c == "function" || typeof u.getSnapshotBeforeUpdate == "function") || typeof u.UNSAFE_componentWillReceiveProps != "function" && typeof u.componentWillReceiveProps != "function" || (i !== _ || d !== f) && Vr(
        l,
        u,
        a,
        f
      ), je = !1, d = l.memoizedState, u.state = d, Yn(l, a, u, n), Bn();
      var g = l.memoizedState;
      i !== _ || d !== g || je || t !== null && t.dependencies !== null && Gu(t.dependencies) ? (typeof c == "function" && (uf(
        l,
        e,
        c,
        a
      ), g = l.memoizedState), (y = je || Zr(
        l,
        e,
        y,
        a,
        d,
        g,
        f
      ) || t !== null && t.dependencies !== null && Gu(t.dependencies)) ? (v || typeof u.UNSAFE_componentWillUpdate != "function" && typeof u.componentWillUpdate != "function" || (typeof u.componentWillUpdate == "function" && u.componentWillUpdate(a, g, f), typeof u.UNSAFE_componentWillUpdate == "function" && u.UNSAFE_componentWillUpdate(
        a,
        g,
        f
      )), typeof u.componentDidUpdate == "function" && (l.flags |= 4), typeof u.getSnapshotBeforeUpdate == "function" && (l.flags |= 1024)) : (typeof u.componentDidUpdate != "function" || i === t.memoizedProps && d === t.memoizedState || (l.flags |= 4), typeof u.getSnapshotBeforeUpdate != "function" || i === t.memoizedProps && d === t.memoizedState || (l.flags |= 1024), l.memoizedProps = a, l.memoizedState = g), u.props = a, u.state = g, u.context = f, a = y) : (typeof u.componentDidUpdate != "function" || i === t.memoizedProps && d === t.memoizedState || (l.flags |= 4), typeof u.getSnapshotBeforeUpdate != "function" || i === t.memoizedProps && d === t.memoizedState || (l.flags |= 1024), a = !1);
    }
    return u = a, Ka(t, l), a = (l.flags & 128) !== 0, u || a ? (u = l.stateNode, e = a && typeof e.getDerivedStateFromError != "function" ? null : u.render(), l.flags |= 1, t !== null && a ? (l.child = ma(
      l,
      t.child,
      null,
      n
    ), l.child = ma(
      l,
      null,
      e,
      n
    )) : It(t, l, e, n), l.memoizedState = u.state, t = l.child) : t = Te(
      t,
      l,
      n
    ), t;
  }
  function u0(t, l, e, a) {
    return ca(), l.flags |= 256, It(t, l, e, a), l.child;
  }
  var rf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function df(t) {
    return { baseLanes: t, cachePool: $o() };
  }
  function hf(t, l, e) {
    return t = t !== null ? t.childLanes & ~e : 0, l && (t |= Cl), t;
  }
  function i0(t, l, e) {
    var a = l.pendingProps, n = !1, u = (l.flags & 128) !== 0, i;
    if ((i = u) || (i = t !== null && t.memoizedState === null ? !1 : (sl.current & 2) !== 0), i && (n = !0, l.flags &= -129), i = (l.flags & 32) !== 0, l.flags &= -33, t === null) {
      if (et) {
        if (n ? we(l) : Ge(), (t = Yt) ? (t = Md(
          t,
          Ql
        ), t = t !== null && t.data !== "&" ? t : null, t !== null && (l.memoizedState = {
          dehydrated: t,
          treeContext: De !== null ? { id: te, overflow: le } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, e = wo(t), e.return = l, l.child = e, ll = l, Yt = null)) : t = null, t === null) throw Ue(l);
        return ds(t) ? l.lanes = 32 : l.lanes = 536870912, null;
      }
      return u = a.children, a = a.fallback, n ? (Ge(), n = l.mode, u = ii(
        { mode: "hidden", children: u },
        n
      ), a = ia(
        a,
        n,
        e,
        null
      ), u.return = l, a.return = l, u.sibling = a, l.child = u, a = l.child, a.memoizedState = df(e), a.childLanes = hf(
        t,
        i,
        e
      ), l.memoizedState = rf, Zn(null, a)) : (we(l), vf(l, u));
    }
    var c = t.memoizedState;
    if (c !== null) {
      var f = c.dehydrated;
      if (f !== null)
        return Pv(
          t,
          l,
          u,
          i,
          a,
          f,
          c,
          e
        );
    }
    return n ? (Ge(), n = a.fallback, u = l.mode, c = t.child, f = c.sibling, a = me(c, {
      mode: "hidden",
      children: a.children
    }), a.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? n = me(f, n) : (n = ia(
      n,
      u,
      e,
      null
    ), n.flags |= 2), n.return = l, a.return = l, a.sibling = n, l.child = a, Zn(null, a), a = l.child, n = t.child.memoizedState, n === null ? n = df(e) : (u = n.cachePool, u !== null ? (c = Jt._currentValue, u = u.parent !== c ? { parent: c, pool: c } : u) : u = $o(), n = {
      baseLanes: n.baseLanes | e,
      cachePool: u
    }), a.memoizedState = n, a.childLanes = hf(
      t,
      i,
      e
    ), l.memoizedState = rf, Zn(t.child, a)) : (we(l), e = t.child, t = e.sibling, e = me(e, {
      mode: "visible",
      children: a.children
    }), e.return = l, e.sibling = null, t !== null && (i = l.deletions, i === null ? (l.deletions = [t], l.flags |= 16) : i.push(t)), l.child = e, l.memoizedState = null, e);
  }
  function vf(t, l) {
    return l = ii(
      { mode: "visible", children: l },
      t.mode
    ), l.return = t, t.child = l;
  }
  function ii(t, l) {
    return t = pl(22, t, null, l), t.lanes = 0, t;
  }
  function ci(t, l, e) {
    return ma(l, t.child, null, e), t = vf(
      l,
      l.pendingProps.children
    ), t.flags |= 2, l.memoizedState = null, t;
  }
  function Pv(t, l, e, a, n, u, i, c) {
    if (e)
      return l.flags & 256 ? (we(l), l.flags &= -257, ci(
        t,
        l,
        c
      )) : l.memoizedState !== null ? (Ge(), l.child = t.child, l.flags |= 128, null) : (Ge(), u = n.fallback, i = l.mode, n = ii(
        { mode: "visible", children: n.children },
        i
      ), u = ia(
        u,
        i,
        c,
        null
      ), u.flags |= 2, n.return = l, u.return = l, n.sibling = u, l.child = n, ma(l, t.child, null, c), n = l.child, n.memoizedState = df(c), n.childLanes = hf(
        t,
        a,
        c
      ), l.memoizedState = rf, Zn(null, n));
    if (we(l), ds(u)) {
      if (a = u.nextSibling && u.nextSibling.dataset, a) var f = a.dgst;
      return a = f, a !== "" && (n = Error(s(419)), n.stack = "", n.digest = a, Rn({ value: n, source: null, stack: null })), ci(
        t,
        l,
        c
      );
    }
    if (kt || sa(t, l, c, !1), a = (c & t.childLanes) !== 0, kt || a) {
      if (Ye.current !== null)
        return ci(
          t,
          l,
          c
        );
      if (a = qt, a !== null && (n = Xs(
        a,
        c
      ), n !== 0 && n !== i.retryLane))
        throw i.retryLane = n, ua(t, n), zl(a, t, n), sf;
      return rs(u) || Ni(), ci(
        t,
        l,
        c
      );
    }
    return rs(u) ? (l.flags |= 192, l.child = t.child, null) : (t = i.treeContext, Yt = Vl(u.nextSibling), ll = l, et = !0, Re = null, Ql = !1, t !== null && Qo(l, t), l = vf(
      l,
      n.children
    ), l.flags |= 134221824, l);
  }
  function c0(t, l, e) {
    t.lanes |= l;
    var a = t.alternate;
    a !== null && (a.lanes |= l), wu(t.return, l, e);
  }
  function f0(t) {
    for (var l = null; t !== null; ) {
      var e = t.alternate;
      e !== null && $u(e) === null && (l = t), t = t.sibling;
    }
    return l;
  }
  function fi(t, l, e, a, n, u) {
    var i = t.memoizedState;
    i === null ? t.memoizedState = {
      isBackwards: l,
      rendering: null,
      renderingStartTime: 0,
      last: a,
      tail: e,
      tailMode: n,
      treeForkCount: u
    } : (i.isBackwards = l, i.rendering = null, i.renderingStartTime = 0, i.last = a, i.tail = e, i.tailMode = n, i.treeForkCount = u);
  }
  function mf(t) {
    var l = t.child;
    for (t.child = null; l !== null; ) {
      var e = l.sibling;
      l.sibling = t.child, t.child = l, l = e;
    }
  }
  function gf(t, l, e) {
    var a = l.pendingProps, n = a.revealOrder, u = a.tail;
    a = a.children;
    var i = sl.current;
    if (l.flags & 128)
      return wn(l, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, l.flags |= 128) : i &= 1, wn(l, i), n === "backwards" && t !== null ? (mf(t), It(t, l, a, e), mf(t)) : It(t, l, a, e), a = et ? Dn : 0, !c && t !== null && (t.flags & 128) !== 0)
      t: for (t = l.child; t !== null; ) {
        if (t.tag === 13)
          t.memoizedState !== null && c0(t, e, l);
        else if (t.tag === 19)
          c0(t, e, l);
        else if (t.child !== null) {
          t.child.return = t, t = t.child;
          continue;
        }
        if (t === l) break t;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === l)
            break t;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    switch (n) {
      case "backwards":
        e = f0(l.child), e === null ? (n = l.child, l.child = null) : (n = e.sibling, e.sibling = null, mf(l)), fi(
          l,
          !0,
          n,
          null,
          u,
          a
        );
        break;
      case "unstable_legacy-backwards":
        for (e = null, n = l.child, l.child = null; n !== null; ) {
          if (t = n.alternate, t !== null && $u(t) === null) {
            l.child = n;
            break;
          }
          t = n.sibling, n.sibling = e, e = n, n = t;
        }
        fi(
          l,
          !0,
          e,
          null,
          u,
          a
        );
        break;
      case "together":
        fi(
          l,
          !1,
          null,
          null,
          void 0,
          a
        );
        break;
      case "independent":
        l.memoizedState = null;
        break;
      default:
        e = f0(l.child), e === null ? (n = l.child, l.child = null) : (n = e.sibling, e.sibling = null), fi(
          l,
          !1,
          n,
          e,
          u,
          a
        );
    }
    return l.child;
  }
  function s0(t, l, e) {
    var a = l.pendingProps;
    return Ce(l, l.type, a.value), It(t, l, a.children, e), l.child;
  }
  function Te(t, l, e) {
    if (t !== null && (l.dependencies = t.dependencies), Ve |= l.lanes, (e & l.childLanes) === 0)
      if (t !== null) {
        if (sa(
          t,
          l,
          e,
          !1
        ), (e & l.childLanes) === 0)
          return null;
      } else return null;
    if (t !== null && l.child !== t.child)
      throw Error(s(153));
    if (l.child !== null) {
      for (t = l.child, e = me(t, t.pendingProps), l.child = e, e.return = l; t.sibling !== null; )
        t = t.sibling, e = e.sibling = me(t, t.pendingProps), e.return = l;
      e.sibling = null;
    }
    return l.child;
  }
  function yf(t, l) {
    return (t.lanes & l) !== 0 ? !0 : (t = t.dependencies, !!(t !== null && Gu(t)));
  }
  function tm(t, l, e) {
    switch (l.tag) {
      case 3:
        hu(l, l.stateNode.containerInfo), Ce(l, Jt, t.memoizedState.cache), ca();
        break;
      case 27:
      case 5:
        Zi(l);
        break;
      case 4:
        hu(l, l.stateNode.containerInfo);
        break;
      case 10:
        Ce(
          l,
          l.type,
          l.memoizedProps.value
        );
        break;
      case 31:
        if (l.memoizedState !== null)
          return l.flags |= 128, Xc(l), null;
        break;
      case 13:
        var a = l.memoizedState;
        if (a !== null) {
          if (a.dehydrated !== null)
            return we(l), l.flags |= 128, null;
          a = sa(
            t,
            l,
            e,
            !1
          );
          var n = l.child.childLanes;
          return a || (e & n) !== 0 ? i0(t, l, e) : (we(l), t = Te(
            t,
            l,
            e
          ), t !== null ? t.sibling : null);
        }
        we(l);
        break;
      case 19:
        if (l.flags & 128)
          return gf(
            t,
            l,
            e
          );
        if (n = (t.flags & 128) !== 0, a = (e & l.childLanes) !== 0, a || (sa(
          t,
          l,
          e,
          !1
        ), a = (e & l.childLanes) !== 0), n) {
          if (a)
            return gf(
              t,
              l,
              e
            );
          l.flags |= 128;
        }
        if (n = l.memoizedState, n !== null && (n.rendering = null, n.tail = null, n.lastEffect = null), wn(l, sl.current), a) break;
        return null;
      case 22:
        return l.lanes = 0, t0(
          t,
          l,
          e,
          l.pendingProps
        );
      case 24:
        Ce(l, Jt, t.memoizedState.cache);
    }
    return Te(t, l, e);
  }
  function o0(t, l, e) {
    if (t !== null)
      if (t.memoizedProps !== l.pendingProps)
        kt = !0;
      else {
        if (!yf(t, e) && (l.flags & 128) === 0)
          return kt = !1, tm(
            t,
            l,
            e
          );
        kt = (t.flags & 131072) !== 0;
      }
    else
      kt = !1, et && (l.flags & 1048576) !== 0 && Xo(l, Dn, l.index);
    switch (l.lanes = 0, l.tag) {
      case 16:
        t: {
          var a = l.pendingProps;
          if (t = ha(l.elementType), l.type = t, typeof t == "function")
            _c(t) ? (a = ya(t, a), l.tag = 1, l = n0(
              null,
              l,
              t,
              a,
              e
            )) : (l.tag = 0, l = of(
              null,
              l,
              t,
              a,
              e
            ));
          else {
            if (t != null) {
              var n = t.$$typeof;
              if (n === M) {
                l.tag = 11, l = Wr(
                  null,
                  l,
                  t,
                  a,
                  e
                );
                break t;
              } else if (n === w) {
                l.tag = 14, l = Ir(
                  null,
                  l,
                  t,
                  a,
                  e
                );
                break t;
              } else if (n === Mt) {
                l.tag = 10, l.type = t, l = s0(
                  null,
                  l,
                  e
                );
                break t;
              }
            }
            throw l = J(t) || t, Error(s(306, l, ""));
          }
        }
        return l;
      case 0:
        return of(
          t,
          l,
          l.type,
          l.pendingProps,
          e
        );
      case 1:
        return a = l.type, n = ya(
          a,
          l.pendingProps
        ), n0(
          t,
          l,
          a,
          n,
          e
        );
      case 3:
        t: {
          if (hu(
            l,
            l.stateNode.containerInfo
          ), t === null) throw Error(s(387));
          a = l.pendingProps;
          var u = l.memoizedState;
          n = u.element, qc(t, l), Yn(l, a, null, e);
          var i = l.memoizedState;
          if (a = i.cache, Ce(l, Jt, a), a !== u.cache && Dc(
            l,
            [Jt],
            e,
            !0
          ), Bn(), a = i.element, u.isDehydrated)
            if (u = {
              element: a,
              isDehydrated: !1,
              cache: i.cache
            }, l.updateQueue.baseState = u, l.memoizedState = u, l.flags & 256) {
              l = u0(
                t,
                l,
                a,
                e
              );
              break t;
            } else if (a !== n) {
              n = wl(
                Error(s(424)),
                l
              ), Rn(n), l = u0(
                t,
                l,
                a,
                e
              );
              break t;
            } else {
              switch (t = l.stateNode.containerInfo, t.nodeType) {
                case 9:
                  t = t.body;
                  break;
                default:
                  t = t.nodeName === "HTML" ? t.ownerDocument.body : t;
              }
              for (Yt = Vl(t.firstChild), ll = l, et = !0, Re = null, Ql = !0, e = tr(
                l,
                null,
                a,
                e
              ), l.child = e; e; )
                e.flags = e.flags & -3 | 134221824, e = e.sibling;
            }
          else {
            if (ca(), a === n) {
              l = Te(
                t,
                l,
                e
              );
              break t;
            }
            It(t, l, a, e);
          }
          l = l.child;
        }
        return l;
      case 26:
        return Ka(t, l), t === null ? (e = jd(
          l.type,
          null,
          l.pendingProps,
          null
        )) ? l.memoizedState = e : et || (l.stateNode = vd(
          l.type,
          l.pendingProps,
          Ne.current,
          l
        )) : l.memoizedState = jd(
          l.type,
          t.memoizedProps,
          l.pendingProps,
          t.memoizedState
        ), null;
      case 27:
        return Zi(l), t === null && et && (a = l.stateNode = Rd(
          l.type,
          l.pendingProps,
          Ne.current
        ), ll = l, Ql = !0, n = Yt, $e(l.type) ? (hs = n, Yt = Vl(a.firstChild)) : Yt = n), It(
          t,
          l,
          l.pendingProps.children,
          e
        ), Ka(t, l), t === null && (l.flags |= 4194304), l.child;
      case 5:
        return t === null && et && ((n = a = Yt) && (a = $m(
          a,
          l.type,
          l.pendingProps,
          Ql
        ), a !== null ? (l.stateNode = a, ll = l, Yt = Vl(a.firstChild), Ql = !1, n = !0) : n = !1), n || Ue(l)), Zi(l), n = l.type, u = l.pendingProps, i = t !== null ? t.memoizedProps : null, a = u.children, ns(n, u) ? a = null : i !== null && ns(n, i) && (l.flags |= 32), l.memoizedState !== null && (n = Vc(
          t,
          l,
          Zv,
          null,
          null,
          e
        ), rn._currentValue = n), Ka(t, l), It(t, l, a, e), l.child;
      case 6:
        return t === null && et && ((t = e = Yt) && (e = km(
          e,
          l.pendingProps,
          Ql
        ), e !== null ? (l.stateNode = e, ll = l, Yt = null, t = !0) : t = !1), t || Ue(l)), null;
      case 13:
        return i0(t, l, e);
      case 4:
        return hu(
          l,
          l.stateNode.containerInfo
        ), a = l.pendingProps, t === null ? l.child = ma(
          l,
          null,
          a,
          e
        ) : It(t, l, a, e), l.child;
      case 11:
        return Wr(
          t,
          l,
          l.type,
          l.pendingProps,
          e
        );
      case 7:
        return a = l.pendingProps, Ka(t, l), It(t, l, a, e), l.child;
      case 8:
        return It(
          t,
          l,
          l.pendingProps.children,
          e
        ), l.child;
      case 12:
        return It(
          t,
          l,
          l.pendingProps.children,
          e
        ), l.child;
      case 10:
        return s0(t, l, e);
      case 9:
        return n = l.type._context, a = l.pendingProps.children, oa(l), n = cl(n), a = a(n), l.flags |= 1, It(t, l, a, e), l.child;
      case 14:
        return Ir(
          t,
          l,
          l.type,
          l.pendingProps,
          e
        );
      case 15:
        return Pr(
          t,
          l,
          l.type,
          l.pendingProps,
          e
        );
      case 19:
        return gf(t, l, e);
      case 31:
        return Iv(t, l, e);
      case 22:
        return t0(
          t,
          l,
          e,
          l.pendingProps
        );
      case 24:
        return oa(l), a = cl(Jt), t === null ? (n = Cc(), n === null && (n = qt, u = Rc(), n.pooledCache = u, u.refCount++, u !== null && (n.pooledCacheLanes |= e), n = u), l.memoizedState = { parent: a, cache: n }, jc(l), Ce(l, Jt, n)) : ((t.lanes & e) !== 0 && (qc(t, l), Yn(l, null, null, e), Bn()), n = t.memoizedState, u = l.memoizedState, n.parent !== a ? (n = { parent: a, cache: a }, l.memoizedState = n, l.lanes === 0 && (l.memoizedState = l.updateQueue.baseState = n), Ce(l, Jt, a)) : (a = u.cache, Ce(l, Jt, a), a !== n.cache && Dc(
          l,
          [Jt],
          e,
          !0
        ))), It(
          t,
          l,
          l.pendingProps.children,
          e
        ), l.child;
      case 30:
        return l.stateNode === null && (l.stateNode = {
          autoName: null,
          paired: null,
          clones: null,
          ref: null
        }), a = l.pendingProps, a.name != null && a.name !== "auto" ? l.flags |= t === null ? 18882560 : 18874368 : et && Bu(l), t !== null && t.memoizedProps.name !== a.name ? l.flags |= 4194816 : Ka(t, l), It(t, l, a.children, e), l.child;
      case 29:
        throw l.pendingProps;
    }
    throw Error(s(156, l.tag));
  }
  function Ee(t) {
    t.flags |= 4;
  }
  function bf(t, l, e, a, n) {
    var u;
    if ((u = (t.mode & 32) !== 0) && (u = e === null ? wd(l, a) : wd(l, a) && (a.src !== e.src || a.srcSet !== e.srcSet)), u) {
      if (t.flags |= 16777216, (n & 335544128) === n)
        if (t.stateNode.complete) t.flags |= 8192;
        else if (L0()) t.flags |= 8192;
        else
          throw va = Vu, Hc;
    } else t.flags &= -16777217;
  }
  function r0(t, l) {
    if (l.type !== "stylesheet" || (l.state.loading & 4) !== 0)
      t.flags &= -16777217;
    else if (t.flags |= 16777216, !Gd(l))
      if (L0()) t.flags |= 8192;
      else
        throw va = Vu, Hc;
  }
  function si(t, l) {
    l !== null && (t.flags |= 4), t.flags & 16384 && (l = t.tag !== 22 ? Ys() : 536870912, t.lanes |= l, Wa |= l);
  }
  function Vn(t, l) {
    if (!et)
      switch (t.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var e = t.tail, a = null; e !== null; )
            e.alternate !== null && (a = e), e = e.sibling;
          a === null ? l || t.tail === null ? t.tail = null : t.tail.sibling = null : a.sibling = null;
          break;
        default:
          for (l = t.tail, e = null; l !== null; )
            l.alternate !== null && (e = l), l = l.sibling;
          e === null ? t.tail = null : e.sibling = null;
      }
  }
  function wt(t) {
    var l = t.alternate !== null && t.alternate.child === t.child, e = 0, a = 0;
    if (l)
      for (var n = t.child; n !== null; )
        e |= n.lanes | n.childLanes, a |= n.subtreeFlags & 1206910976, a |= n.flags & 1206910976, n.return = t, n = n.sibling;
    else
      for (n = t.child; n !== null; )
        e |= n.lanes | n.childLanes, a |= n.subtreeFlags, a |= n.flags, n.return = t, n = n.sibling;
    return t.subtreeFlags |= a, t.childLanes = e, l;
  }
  function lm(t, l, e) {
    var a = l.pendingProps;
    switch (Oc(l), l.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return wt(l), null;
      case 1:
        return wt(l), null;
      case 3:
        return e = l.stateNode, a = null, t !== null && (a = t.memoizedState.cache), l.memoizedState.cache !== a && (l.flags |= 2048), be(Jt), _a(), e.pendingContext && (e.context = e.pendingContext, e.pendingContext = null), (t === null || t.child === null) && (wa(l) ? Ee(l) : t === null || t.memoizedState.isDehydrated && (l.flags & 256) === 0 || (l.flags |= 1024, Mc())), wt(l), null;
      case 26:
        var n = l.type, u = l.memoizedState;
        return t === null ? (Ee(l), u !== null ? (wt(l), r0(l, u)) : (wt(l), bf(
          l,
          n,
          null,
          a,
          e
        ))) : u ? u !== t.memoizedState ? (Ee(l), wt(l), r0(l, u)) : (wt(l), l.flags &= -16777217) : (t = t.memoizedProps, t !== a && Ee(l), wt(l), bf(
          l,
          n,
          t,
          a,
          e
        )), null;
      case 27:
        if (vu(l), e = Ne.current, n = l.type, t !== null && l.stateNode != null)
          t.memoizedProps !== a && Ee(l);
        else {
          if (!a) {
            if (l.stateNode === null)
              throw Error(s(166));
            return wt(l), l.subtreeFlags &= -33554433, null;
          }
          t = vl.current, wa(l) ? Zo(l) : (t = Rd(n, a, e), l.stateNode = t, Ee(l));
        }
        return wt(l), l.subtreeFlags &= -33554433, null;
      case 5:
        if (vu(l), n = l.type, t !== null && l.stateNode != null)
          t.memoizedProps !== a && Ee(l);
        else {
          if (!a) {
            if (l.stateNode === null)
              throw Error(s(166));
            return wt(l), l.subtreeFlags &= -33554433, null;
          }
          if (u = vl.current, wa(l))
            Zo(l);
          else {
            var i = lu(
              Ne.current
            );
            switch (u) {
              case 1:
                u = i.createElementNS(
                  "http://www.w3.org/2000/svg",
                  n
                );
                break;
              case 2:
                u = i.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  n
                );
                break;
              default:
                switch (n) {
                  case "svg":
                    u = i.createElementNS(
                      "http://www.w3.org/2000/svg",
                      n
                    );
                    break;
                  case "math":
                    u = i.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      n
                    );
                    break;
                  case "script":
                    u = i.createElement("div"), u.innerHTML = "<script><\/script>", u = u.removeChild(
                      u.firstChild
                    );
                    break;
                  case "select":
                    u = typeof a.is == "string" ? i.createElement("select", {
                      is: a.is
                    }) : i.createElement("select"), a.multiple ? u.multiple = !0 : a.size && (u.size = a.size);
                    break;
                  default:
                    u = typeof a.is == "string" ? i.createElement(n, { is: a.is }) : i.createElement(n);
                }
            }
            u[il] = l, u[Sl] = a;
            t: for (i = l.child; i !== null; ) {
              if (i.tag === 5 || i.tag === 6)
                u.appendChild(i.stateNode);
              else if (i.tag !== 4 && i.tag !== 27 && i.child !== null) {
                i.child.return = i, i = i.child;
                continue;
              }
              if (i === l) break t;
              for (; i.sibling === null; ) {
                if (i.return === null || i.return === l)
                  break t;
                i = i.return;
              }
              i.sibling.return = i.return, i = i.sibling;
            }
            l.stateNode = u;
            t: switch (rl(u, n, a), n) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                a = !!a.autoFocus;
                break t;
              case "img":
                a = !0;
                break t;
              default:
                a = !1;
            }
            a && Ee(l);
          }
        }
        return wt(l), l.subtreeFlags &= -33554433, bf(
          l,
          l.type,
          t === null ? null : t.memoizedProps,
          l.pendingProps,
          e
        ), null;
      case 6:
        if (t && l.stateNode != null)
          t.memoizedProps !== a && Ee(l);
        else {
          if (typeof a != "string" && l.stateNode === null)
            throw Error(s(166));
          if (t = Ne.current, wa(l)) {
            if (t = l.stateNode, e = l.memoizedProps, a = null, n = ll, n !== null)
              switch (n.tag) {
                case 27:
                case 5:
                  a = n.memoizedProps;
              }
            t[il] = l, t = !!(t.nodeValue === e || a !== null && a.suppressHydrationWarning === !0 || od(t.nodeValue, e)), t || Ue(l, !0);
          } else
            t = lu(t).createTextNode(
              a
            ), t[il] = l, l.stateNode = t;
        }
        return wt(l), null;
      case 31:
        if (e = l.memoizedState, t === null || t.memoizedState !== null) {
          if (a = wa(l), e !== null) {
            if (t === null) {
              if (!a) throw Error(s(318));
              if (t = l.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(s(557));
              t[il] = l;
            } else
              ca(), (l.flags & 128) === 0 && (l.memoizedState = null), l.flags |= 4;
            wt(l), t = !1;
          } else
            e = Mc(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = e), t = !0;
          if (!t)
            return l.flags & 256 ? (Dl(l), l) : (Dl(l), null);
          if ((l.flags & 128) !== 0)
            throw Error(s(558));
        }
        return wt(l), null;
      case 13:
        if (a = l.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (n = wa(l), a !== null && a.dehydrated !== null) {
            if (t === null) {
              if (!n) throw Error(s(318));
              if (n = l.memoizedState, n = n !== null ? n.dehydrated : null, !n) throw Error(s(317));
              n[il] = l;
            } else
              ca(), (l.flags & 128) === 0 && (l.memoizedState = null), l.flags |= 4;
            wt(l), n = !1;
          } else
            n = Mc(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = n), n = !0;
          if (!n)
            return l.flags & 256 ? (Dl(l), l) : (Dl(l), null);
        }
        return Dl(l), (l.flags & 128) !== 0 ? (l.lanes = e, l) : (e = a !== null, t = t !== null && t.memoizedState !== null, e && (a = l.child, n = null, a.alternate !== null && a.alternate.memoizedState !== null && a.alternate.memoizedState.cachePool !== null && (n = a.alternate.memoizedState.cachePool.pool), u = null, a.memoizedState !== null && a.memoizedState.cachePool !== null && (u = a.memoizedState.cachePool.pool), u !== n && (a.flags |= 2048)), e !== t && e && (l.child.flags |= 8192), si(l, l.updateQueue), wt(l), null);
      case 4:
        return _a(), t === null && Pf(l.stateNode.containerInfo), l.flags |= 67108864, wt(l), null;
      case 10:
        return be(l.type), wt(l), null;
      case 19:
        if (Qc(l), a = l.memoizedState, a === null) return wt(l), null;
        if (n = (l.flags & 128) !== 0, u = a.rendering, u === null)
          if (n) Vn(a, !1);
          else {
            if (Lt !== 0 || t !== null && (t.flags & 128) !== 0)
              for (t = l.child; t !== null; ) {
                if (u = $u(t), u !== null) {
                  for (l.flags |= 128, Vn(a, !1), t = u.updateQueue, l.updateQueue = t, si(l, t), l.subtreeFlags = 0, t = e, e = l.child; e !== null; )
                    Yo(e, t), e = e.sibling;
                  return wn(
                    l,
                    sl.current & 1 | 2
                  ), et && ge(l, a.treeForkCount), l.child;
                }
                t = t.sibling;
              }
            a.tail !== null && Nl() > Ti && (l.flags |= 128, n = !0, Vn(a, !1), l.lanes = 4194304);
          }
        else {
          if (!n)
            if (t = $u(u), t !== null) {
              if (l.flags |= 128, n = !0, t = t.updateQueue, l.updateQueue = t, si(l, t), Vn(a, !0), a.tail === null && a.tailMode !== "collapsed" && a.tailMode !== "visible" && !u.alternate && !et)
                return wt(l), null;
            } else
              2 * Nl() - a.renderingStartTime > Ti && e !== 536870912 && (l.flags |= 128, n = !0, Vn(a, !1), l.lanes = 4194304);
          a.isBackwards ? (u.sibling = l.child, l.child = u) : (t = a.last, t !== null ? t.sibling = u : l.child = u, a.last = u);
        }
        if (a.tail !== null) {
          t = a.tail;
          t: {
            for (e = t; e !== null; ) {
              if (e.alternate !== null) {
                e = !1;
                break t;
              }
              e = e.sibling;
            }
            e = !0;
          }
          return a.rendering = t, a.tail = t.sibling, a.renderingStartTime = Nl(), t.sibling = null, u = sl.current, u = n ? u & 1 | 2 : u & 1, a.tailMode === "visible" || a.tailMode === "collapsed" || !e || et ? wn(l, u) : (e = u, gt(fl, l), gt(sl, e), hl === null && (hl = l)), et && ge(l, a.treeForkCount), t;
        }
        return wt(l), null;
      case 22:
      case 23:
        return Dl(l), Gc(), a = l.memoizedState !== null, t !== null ? t.memoizedState !== null !== a && (l.flags |= 8192) : a && (l.flags |= 8192), a ? (e & 536870912) !== 0 && (l.flags & 128) === 0 && (wt(l), l.subtreeFlags & 6 && (l.flags |= 8192)) : wt(l), e = l.updateQueue, e !== null && si(l, e.retryQueue), e = null, t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), a = null, l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), a !== e && (l.flags |= 2048), t !== null && it(da), null;
      case 24:
        return e = null, t !== null && (e = t.memoizedState.cache), l.memoizedState.cache !== e && (l.flags |= 2048), be(Jt), wt(l), null;
      case 25:
        return null;
      case 30:
        return l.flags |= 33554432, wt(l), null;
    }
    throw Error(s(156, l.tag));
  }
  function em(t, l) {
    switch (Oc(l), l.tag) {
      case 1:
        return t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 3:
        return be(Jt), _a(), t = l.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (l.flags = t & -65537 | 128, l) : null;
      case 26:
      case 27:
      case 5:
        return vu(l), null;
      case 31:
        if (l.memoizedState !== null) {
          if (Dl(l), l.alternate === null)
            throw Error(s(340));
          ca();
        }
        return t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 13:
        if (Dl(l), t = l.memoizedState, t !== null && t.dehydrated !== null) {
          if (l.alternate === null)
            throw Error(s(340));
          ca();
        }
        return t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 19:
        return Qc(l), t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, t = l.memoizedState, t !== null && (t.rendering = null, t.tail = null), l.flags |= 4, l) : null;
      case 4:
        return _a(), null;
      case 10:
        return be(l.type), null;
      case 22:
      case 23:
        return Dl(l), Gc(), t !== null && it(da), t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 24:
        return be(Jt), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function d0(t, l) {
    switch (Oc(l), l.tag) {
      case 3:
        be(Jt), _a();
        break;
      case 26:
      case 27:
      case 5:
        vu(l);
        break;
      case 4:
        _a();
        break;
      case 31:
        l.memoizedState !== null && Dl(l);
        break;
      case 13:
        Dl(l);
        break;
      case 19:
        Qc(l);
        break;
      case 10:
        be(l.type);
        break;
      case 22:
      case 23:
        Dl(l), Gc(), t !== null && it(da);
        break;
      case 24:
        be(Jt);
    }
  }
  function Ln(t, l) {
    try {
      var e = l.updateQueue, a = e !== null ? e.lastEffect : null;
      if (a !== null) {
        var n = a.next;
        e = n;
        do {
          if ((e.tag & t) === t) {
            a = void 0;
            var u = e.create, i = e.inst;
            a = u(), i.destroy = a;
          }
          e = e.next;
        } while (e !== n);
      }
    } catch (c) {
      Dt(l, l.return, c);
    }
  }
  function Xe(t, l, e) {
    try {
      var a = l.updateQueue, n = a !== null ? a.lastEffect : null;
      if (n !== null) {
        var u = n.next;
        a = u;
        do {
          if ((a.tag & t) === t) {
            var i = a.inst, c = i.destroy;
            if (c !== void 0) {
              i.destroy = void 0, n = l;
              var f = e, v = c;
              try {
                v();
              } catch (y) {
                Dt(
                  n,
                  f,
                  y
                );
              }
            }
          }
          a = a.next;
        } while (a !== u);
      }
    } catch (y) {
      Dt(l, l.return, y);
    }
  }
  function h0(t) {
    var l = t.updateQueue;
    if (l !== null) {
      var e = t.stateNode;
      try {
        er(l, e);
      } catch (a) {
        Dt(t, t.return, a);
      }
    }
  }
  function v0(t, l, e) {
    e.props = ya(
      t.type,
      t.memoizedProps
    ), e.state = t.memoizedState;
    try {
      e.componentWillUnmount();
    } catch (a) {
      Dt(t, l, a);
    }
  }
  function ee(t, l) {
    try {
      var e = t.ref;
      if (e !== null) {
        switch (t.tag) {
          case 26:
          case 27:
          case 5:
            var a = t.stateNode;
            break;
          case 30:
            var n = t.stateNode, u = he(t.memoizedProps, n);
            (n.ref === null || n.ref.name !== u) && (n.ref = Td(u)), a = n.ref;
            break;
          case 7:
            if (t.stateNode === null) {
              var i = new jl(t);
              p(
                t.child,
                !1,
                Km,
                i,
                void 0,
                void 0
              ), t.stateNode = i;
            }
            a = t.stateNode;
            break;
          default:
            a = t.stateNode;
        }
        typeof e == "function" ? t.refCleanup = e(a) : e.current = a;
      }
    } catch (c) {
      Dt(t, l, c);
    }
  }
  function ol(t, l) {
    var e = t.ref, a = t.refCleanup;
    if (e !== null)
      if (typeof a == "function")
        try {
          a();
        } catch (n) {
          Dt(t, l, n);
        } finally {
          t.refCleanup = null, t = t.alternate, t != null && (t.refCleanup = null);
        }
      else if (typeof e == "function")
        try {
          e(null);
        } catch (n) {
          Dt(t, l, n);
        }
      else e.current = null;
  }
  function oi(t, l) {
    if ((t.tag === 5 || t.tag === 27 || t.tag === 6) && t.alternate === null && l !== null)
      for (var e = 0; e < l.length; e++)
        Ad(
          t.stateNode,
          l[e]
        );
  }
  function m0(t) {
    for (var l = t.return; l !== null && (pf(l) && Ad(t.stateNode, l.stateNode), !Sf(l)); )
      l = l.return;
  }
  function Kn(t) {
    for (var l = t.return; l !== null && (pf(l) && Jm(t.stateNode, l.stateNode), !Sf(l)); )
      l = l.return;
  }
  function Sf(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 27;
  }
  function pf(t) {
    return t && t.tag === 7 && t.stateNode !== null;
  }
  function Tf(t) {
    var l = t.type, e = t.memoizedProps, a = t.stateNode;
    try {
      t: switch (l) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          e.autoFocus && a.focus();
          break t;
        case "img":
          e.src ? a.src = e.src : e.srcSet && (a.srcset = e.srcSet);
      }
    } catch (n) {
      Dt(t, t.return, n);
    }
  }
  function Ef(t, l, e) {
    try {
      var a = t.stateNode;
      Mm(a, t.type, e, l), a[Sl] = l;
    } catch (n) {
      Dt(t, t.return, n);
    }
  }
  function g0(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 26 || t.tag === 27 && $e(t.type) || t.tag === 4;
  }
  function _f(t) {
    t: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || g0(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.tag === 27 && $e(t.type) || t.flags & 2 || t.child === null || t.tag === 4) continue t;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function zf(t, l, e, a) {
    var n = t.tag;
    if (n === 5 || n === 6)
      n = t.stateNode, l ? (e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e).insertBefore(n, l) : (l = e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, l.appendChild(n), e = e._reactRootContainer, e != null || l.onclick !== null || (l.onclick = Pl)), oi(t, a), St = !0;
    else if (n !== 4 && (n === 27 && (oi(t, a), a = null, $e(t.type) && (e = t.stateNode, l = null)), t = t.child, t !== null))
      for (zf(
        t,
        l,
        e,
        a
      ), t = t.sibling; t !== null; )
        zf(
          t,
          l,
          e,
          a
        ), t = t.sibling;
  }
  function ri(t, l, e, a) {
    var n = t.tag;
    if (n === 5 || n === 6)
      n = t.stateNode, l ? e.insertBefore(n, l) : e.appendChild(n), oi(t, a), St = !0;
    else if (n !== 4 && (n === 27 && (oi(t, a), a = null, $e(t.type) && (e = t.stateNode)), t = t.child, t !== null))
      for (ri(
        t,
        l,
        e,
        a
      ), t = t.sibling; t !== null; )
        ri(
          t,
          l,
          e,
          a
        ), t = t.sibling;
  }
  function y0(t) {
    var l = t.stateNode, e = t.memoizedProps;
    try {
      for (var a = t.type, n = l.attributes; n.length; )
        l.removeAttributeNode(n[0]);
      rl(l, a, e), l[il] = t, l[Sl] = e;
    } catch (u) {
      Dt(t, t.return, u);
    }
  }
  var di = !1, Rl = null;
  function b0(t) {
    (t.tag === 30 || (t.subtreeFlags & 33554432) !== 0) && (di = !0);
  }
  var ae = null;
  function S0() {
    var t = ae;
    return ae = null, t;
  }
  var Tl = 0;
  function Ja(t, l, e, a, n) {
    return Tl = 0, p0(
      t.child,
      l,
      e,
      a,
      n
    );
  }
  function p0(t, l, e, a, n) {
    for (var u = !1; t !== null; ) {
      if (t.tag === 5) {
        var i = t.stateNode;
        if (a !== null) {
          var c = cs(i);
          a.push(c), c.view && (u = !0);
        } else
          u || cs(i).view && (u = !0);
        di = !0, Sd(
          i,
          Tl === 0 ? l : l + "_" + Tl,
          e
        ), Tl++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && n || p0(
        t.child,
        l,
        e,
        a,
        n
      ) && (u = !0));
      t = t.sibling;
    }
    return u;
  }
  function ne(t, l) {
    for (; t !== null; )
      t.tag === 5 ? pd(t.stateNode, t.memoizedProps) : (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && l || ne(
        t.child,
        l
      )), t = t.sibling;
  }
  function hi(t) {
    if ((t.subtreeFlags & 18874368) !== 0)
      for (t = t.child; t !== null; ) {
        if ((t.tag !== 22 || t.memoizedState === null) && (hi(t), t.tag === 30 && (t.flags & 18874368) !== 0 && t.stateNode.paired)) {
          var l = t.memoizedProps;
          if (l.name == null || l.name === "auto")
            throw Error(s(544));
          var e = l.name;
          l = ve(l.default, l.share), l !== "none" && (Ja(
            t,
            e,
            l,
            null,
            !1
          ) || ne(t.child, !1));
        }
        t = t.sibling;
      }
  }
  function Nf(t, l) {
    if (t.tag === 30) {
      var e = t.stateNode, a = t.memoizedProps, n = he(a, e), u = ve(
        a.default,
        e.paired ? a.share : a.enter
      );
      u !== "none" ? Ja(t, n, u, null, !1) ? (hi(t), e.paired || l || ln(t, a.onEnter)) : ne(t.child, !1) : hi(t);
    } else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        Nf(t, l), t = t.sibling;
    else hi(t);
  }
  function Of(t) {
    if (Rl !== null && Rl.size !== 0) {
      var l = Rl;
      if ((t.subtreeFlags & 18874368) !== 0)
        for (t = t.child; t !== null; ) {
          if (t.tag !== 22 || t.memoizedState === null) {
            if (t.tag === 30 && (t.flags & 18874368) !== 0) {
              var e = t.memoizedProps, a = e.name;
              if (a != null && a !== "auto") {
                var n = l.get(a);
                if (n !== void 0) {
                  var u = ve(
                    e.default,
                    e.share
                  );
                  if (u !== "none" && (Ja(
                    t,
                    a,
                    u,
                    null,
                    !1
                  ) ? (u = t.stateNode, n.paired = u, u.paired = n, ln(t, e.onShare)) : ne(t.child, !1)), l.delete(a), l.size === 0) break;
                }
              }
            }
            Of(t);
          }
          t = t.sibling;
        }
    }
  }
  function Af(t) {
    if (t.tag === 30) {
      var l = t.memoizedProps, e = he(l, t.stateNode), a = Rl !== null ? Rl.get(e) : void 0, n = ve(
        l.default,
        a !== void 0 ? l.share : l.exit
      );
      n !== "none" && (Ja(t, e, n, null, !1) ? a !== void 0 ? (n = t.stateNode, a.paired = n, n.paired = a, Rl.delete(e), ln(t, l.onShare)) : ln(t, l.onExit) : ne(t.child, !1)), Rl !== null && Of(t);
    } else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        Af(t), t = t.sibling;
    else
      Rl !== null && Of(t);
  }
  function T0(t) {
    for (t = t.child; t !== null; ) {
      if (t.tag === 30) {
        var l = t.memoizedProps, e = he(l, t.stateNode);
        l = ve(l.default, l.update), t.flags &= -5, l !== "none" && Ja(
          t,
          e,
          l,
          t.memoizedState = [],
          !1
        );
      } else
        (t.subtreeFlags & 33554432) !== 0 && T0(t);
      t = t.sibling;
    }
  }
  function Mf(t) {
    if ((t.subtreeFlags & 18874368) !== 0)
      for (t = t.child; t !== null; ) {
        if (t.tag !== 22 || t.memoizedState === null) {
          if (t.tag === 30 && (t.flags & 18874368) !== 0) {
            var l = t.stateNode;
            l.paired !== null && (l.paired = null, ne(t.child, !1));
          }
          Mf(t);
        }
        t = t.sibling;
      }
  }
  function vi(t) {
    if (t.tag === 30)
      t.stateNode.paired = null, ne(t.child, !1), Mf(t);
    else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        vi(t), t = t.sibling;
    else Mf(t);
  }
  function E0(t) {
    for (t = t.child; t !== null; )
      t.tag === 30 ? ne(t.child, !1) : (t.subtreeFlags & 33554432) !== 0 && E0(t), t = t.sibling;
  }
  function xf(t, l, e, a, n, u, i) {
    for (var c = !1; l !== null; ) {
      if (l.tag === 5) {
        var f = l.stateNode;
        if (u !== null && Tl < u.length) {
          var v = u[Tl], y = cs(f);
          (v.view || y.view) && (c = !0);
          var _;
          if (_ = (t.flags & 4) === 0)
            if (y.clip) _ = !0;
            else {
              _ = v.rect;
              var d = y.rect;
              _ = _.y !== d.y || _.x !== d.x || _.height !== d.height || _.width !== d.width;
            }
          _ && (t.flags |= 4), y.abs ? y = !v.abs : (v = v.rect, y = y.rect, y = v.height !== y.height || v.width !== y.width), y && (t.flags |= 32);
        } else t.flags |= 32;
        (t.flags & 4) !== 0 && Sd(
          f,
          Tl === 0 ? e : e + "_" + Tl,
          n
        ), c && (t.flags & 4) !== 0 || (ae === null && (ae = []), ae.push(
          f,
          Tl === 0 ? a : a + "_" + Tl,
          l.memoizedProps
        )), Tl++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && i ? t.flags |= l.flags & 32 : xf(
        t,
        l.child,
        e,
        a,
        n,
        u,
        i
      ) && (c = !0));
      l = l.sibling;
    }
    return c;
  }
  function _0(t, l) {
    for (t = t.child; t !== null; ) {
      if (t.tag === 30) {
        var e = t.memoizedProps, a = t.stateNode, n = he(e, a), u = ve(e.default, e.update), i;
        i = t.memoizedState, t.memoizedState = null, a = t;
        var c = t.child;
        Tl = 0, n = xf(
          a,
          c,
          n,
          n,
          u,
          i,
          !1
        ), (t.flags & 4) !== 0 && n && ln(t, e.onUpdate);
      } else
        (t.subtreeFlags & 33554432) !== 0 && _0(t);
      t = t.sibling;
    }
  }
  var el = !1, zt = !1, ue = !1, Df = !1, z0 = typeof WeakSet == "function" ? WeakSet : Set, al = null, ie = !1, Jn = !1, mi = !1, Rf = !1;
  function am(t, l, e) {
    if (t = t.containerInfo, es = dn, t = Mo(t), gc(t)) {
      if ("selectionStart" in t)
        var a = {
          start: t.selectionStart,
          end: t.selectionEnd
        };
      else
        t: {
          a = (a = t.ownerDocument) && a.defaultView || window;
          var n = a.getSelection && a.getSelection();
          if (n && n.rangeCount !== 0) {
            a = n.anchorNode;
            var u = n.anchorOffset, i = n.focusNode;
            n = n.focusOffset;
            try {
              a.nodeType, i.nodeType;
            } catch {
              a = null;
              break t;
            }
            var c = 0, f = -1, v = -1, y = 0, _ = 0, d = t, g = null;
            l: for (; ; ) {
              for (var D; d !== a || u !== 0 && d.nodeType !== 3 || (f = c + u), d !== i || n !== 0 && d.nodeType !== 3 || (v = c + n), d.nodeType === 3 && (c += d.nodeValue.length), (D = d.firstChild) !== null; )
                g = d, d = D;
              for (; ; ) {
                if (d === t) break l;
                if (g === a && ++y === u && (f = c), g === i && ++_ === n && (v = c), (D = d.nextSibling) !== null) break;
                d = g, g = d.parentNode;
              }
              d = D;
            }
            a = f === -1 || v === -1 ? null : { start: f, end: v };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (as = { focusedElem: t, selectionRange: a }, dn = !1, e = (e & 335544064) === e, al = l, l = e ? 9270 : 1024; al !== null; ) {
      if (t = al, e && (a = t.deletions, a !== null))
        for (u = 0; u < a.length; u++)
          e && Af(a[u]);
      if (t.alternate === null && (t.flags & 2) !== 0)
        e && b0(t), gi(e);
      else {
        if (t.tag === 22) {
          if (a = t.alternate, t.memoizedState !== null) {
            a !== null && a.memoizedState === null && e && Af(a), gi(e);
            continue;
          } else if (a !== null && a.memoizedState !== null) {
            e && b0(t), gi(e);
            continue;
          }
        }
        a = t.child, (t.subtreeFlags & l) !== 0 && a !== null ? (a.return = t, al = a) : (e && T0(t), gi(e));
      }
    }
    Rl = null;
  }
  function gi(t) {
    for (; al !== null; ) {
      var l = al, e = t, a = l.alternate, n = l.flags;
      switch (l.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if ((n & 1024) !== 0 && a !== null) {
            e = void 0, n = a.memoizedProps, a = a.memoizedState;
            var u = l.stateNode;
            try {
              var i = ya(
                l.type,
                n
              );
              e = u.getSnapshotBeforeUpdate(
                i,
                a
              ), u.__reactInternalSnapshotBeforeUpdate = e;
            } catch (c) {
              Dt(l, l.return, c);
            }
          }
          break;
        case 3:
          if ((n & 1024) !== 0) {
            if (a = l.stateNode.containerInfo, e = a.nodeType, e === 9)
              os(a);
            else if (e === 1)
              switch (a.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  os(a);
                  break;
                default:
                  a.textContent = "";
              }
          }
          break;
        case 5:
        case 26:
        case 27:
        case 6:
        case 4:
        case 17:
          break;
        case 30:
          e && a !== null && (e = he(
            a.memoizedProps,
            a.stateNode
          ), n = l.memoizedProps, n = ve(n.default, n.update), n !== "none" && Ja(
            a,
            e,
            n,
            a.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((n & 1024) !== 0) throw Error(s(163));
      }
      if (a = l.sibling, a !== null) {
        a.return = l.return, al = a;
        break;
      }
      al = l.return;
    }
  }
  function N0(t, l, e) {
    var a = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 15:
        ce(t, e), a & 4 && Ln(5, e);
        break;
      case 1:
        if (ce(t, e), a & 4)
          if (t = e.stateNode, l === null)
            try {
              t.componentDidMount();
            } catch (i) {
              Dt(e, e.return, i);
            }
          else {
            var n = ya(
              e.type,
              l.memoizedProps
            );
            l = l.memoizedState;
            try {
              t.componentDidUpdate(
                n,
                l,
                t.__reactInternalSnapshotBeforeUpdate
              );
            } catch (i) {
              Dt(
                e,
                e.return,
                i
              );
            }
          }
        a & 64 && h0(e), a & 512 && ee(e, e.return);
        break;
      case 3:
        if (ce(t, e), a & 64 && (t = e.updateQueue, t !== null)) {
          if (l = null, e.child !== null)
            switch (e.child.tag) {
              case 27:
              case 5:
                l = e.child.stateNode;
                break;
              case 1:
                l = e.child.stateNode;
            }
          try {
            er(t, l);
          } catch (i) {
            Dt(e, e.return, i);
          }
        }
        break;
      case 27:
        l === null && a & 4 && y0(e);
      case 26:
      case 5:
        ce(t, e), l === null && a & 4 && Tf(e), a & 512 && ee(e, e.return);
        break;
      case 12:
        ce(t, e);
        break;
      case 31:
        ce(t, e), a & 4 && x0(t, e);
        break;
      case 13:
        ce(t, e), a & 4 && D0(t, e), a & 64 && (t = e.memoizedState, t !== null && (t = t.dehydrated, t !== null && (e = mm.bind(
          null,
          e
        ), Fm(t, e))));
        break;
      case 22:
        if (a = e.memoizedState !== null || el, !a) {
          var u = l !== null && l.memoizedState !== null || zt;
          l = el, n = zt, el = a, (zt = u) && !n ? (a = 2, (e.subtreeFlags & 8772) !== 0 && (a |= 1), kl(
            t,
            e,
            a
          )) : ce(t, e), el = l, zt = n;
        }
        break;
      case 30:
        ce(t, e), a & 512 && ee(e, e.return);
        break;
      case 7:
        a & 512 && ee(e, e.return);
      default:
        ce(t, e);
    }
  }
  function Uf(t, l) {
    for (t = t.child; t !== null; )
      O0(t, l), t = t.sibling;
  }
  function O0(t, l) {
    switch (t.tag) {
      case 5:
      case 26:
        try {
          var e = t.stateNode;
          if (l) {
            var a = e.style;
            typeof a.setProperty == "function" ? a.setProperty("display", "none", "important") : a.display = "none";
          } else {
            var n = t.stateNode, u = t.memoizedProps.style, i = u != null && u.hasOwnProperty("display") ? u.display : null;
            n.style.display = i == null || typeof i == "boolean" ? "" : ("" + i).trim();
          }
        } catch (f) {
          Dt(t, t.return, f);
        }
        Cf(t, l);
        break;
      case 6:
        try {
          t.stateNode.nodeValue = l ? "" : t.memoizedProps, St = !0;
        } catch (f) {
          Dt(t, t.return, f);
        }
        break;
      case 18:
        try {
          var c = t.stateNode;
          l ? bd(c, !0) : bd(t.stateNode, !1);
        } catch (f) {
          Dt(t, t.return, f);
        }
        break;
      case 22:
      case 23:
        t.memoizedState === null && Uf(t, l);
        break;
      default:
        Uf(t, l);
    }
  }
  function Cf(t, l) {
    if (t.subtreeFlags & 67108864)
      for (t = t.child; t !== null; ) {
        t: {
          var e = t, a = l;
          switch (e.tag) {
            case 4:
              O0(e, a);
              break t;
            case 22:
              e.memoizedState === null && Cf(e, a);
              break t;
            default:
              Cf(e, a);
          }
        }
        t = t.sibling;
      }
  }
  function A0(t) {
    var l = t.alternate;
    l !== null && (t.alternate = null, A0(l)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (l = t.stateNode, l !== null && Tu(l)), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  var Gt = null, El = !1;
  function Jl(t, l, e) {
    for (e = e.child; e !== null; )
      M0(t, l, e), e = e.sibling;
  }
  function M0(t, l, e) {
    if (Ol && typeof Ol.onCommitFiberUnmount == "function")
      try {
        Ol.onCommitFiberUnmount(gn, e);
      } catch {
      }
    switch (e.tag) {
      case 26:
        zt || ol(e, l), Jl(
          t,
          l,
          e
        ), e.memoizedState ? e.memoizedState.count-- : e.stateNode && !zt && (e = e.stateNode, e.parentNode.removeChild(e));
        break;
      case 27:
        zt || ol(e, l), Kn(e);
        var a = Gt, n = El;
        $e(e.type) && (Gt = e.stateNode, El = !1), Jl(
          t,
          l,
          e
        ), Ud(
          e.stateNode,
          e.type,
          e.memoizedProps
        ), Gt = a, El = n;
        break;
      case 5:
        zt || ol(e, l), Kn(e);
      case 6:
        if (e.tag === 6 && Kn(e), a = Gt, n = El, Gt = null, Jl(
          t,
          l,
          e
        ), Gt = a, El = n, Gt !== null)
          if (El)
            try {
              (Gt.nodeType === 9 ? Gt.body : Gt.nodeName === "HTML" ? Gt.ownerDocument.body : Gt).removeChild(e.stateNode), St = !0;
            } catch (u) {
              Dt(
                e,
                l,
                u
              );
            }
          else
            try {
              Gt.removeChild(e.stateNode), St = !0;
            } catch (u) {
              Dt(
                e,
                l,
                u
              );
            }
        break;
      case 18:
        Gt !== null && (El ? (t = Gt, yd(
          t.nodeType === 9 ? t.body : t.nodeName === "HTML" ? t.ownerDocument.body : t,
          e.stateNode
        ), hn(t)) : yd(Gt, e.stateNode));
        break;
      case 4:
        a = Gt, n = El, Gt = e.stateNode.containerInfo, El = !0, Jl(
          t,
          l,
          e
        ), Gt = a, El = n;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Xe(2, e, l), zt || Xe(4, e, l), Jl(
          t,
          l,
          e
        );
        break;
      case 1:
        zt || (ol(e, l), a = e.stateNode, typeof a.componentWillUnmount == "function" && v0(
          e,
          l,
          a
        )), Jl(
          t,
          l,
          e
        );
        break;
      case 21:
        Jl(
          t,
          l,
          e
        );
        break;
      case 22:
        zt = (a = zt) || e.memoizedState !== null, Jl(
          t,
          l,
          e
        ), zt = a;
        break;
      case 30:
        ol(e, l), Jl(
          t,
          l,
          e
        );
        break;
      case 7:
        zt || ol(e, l), Jl(
          t,
          l,
          e
        );
        break;
      default:
        Jl(
          t,
          l,
          e
        );
    }
  }
  function x0(t, l) {
    if (l.memoizedState === null && (t = l.alternate, t !== null && (t = t.memoizedState, t !== null))) {
      t = t.dehydrated;
      try {
        hn(t);
      } catch (e) {
        Dt(l, l.return, e);
      }
    }
  }
  function D0(t, l) {
    if (l.memoizedState === null && (t = l.alternate, t !== null && (t = t.memoizedState, t !== null && (t = t.dehydrated, t !== null))))
      try {
        hn(t);
      } catch (e) {
        Dt(l, l.return, e);
      }
  }
  function nm(t) {
    switch (t.tag) {
      case 31:
      case 13:
      case 19:
        var l = t.stateNode;
        return l === null && (l = t.stateNode = new z0()), l;
      case 22:
        return t = t.stateNode, l = t._retryCache, l === null && (l = t._retryCache = new z0()), l;
      default:
        throw Error(s(435, t.tag));
    }
  }
  function yi(t, l) {
    var e = nm(t);
    l.forEach(function(a) {
      if (!e.has(a)) {
        e.add(a);
        var n = gm.bind(null, t, a);
        a.then(n, n);
      }
    });
  }
  function yl(t, l, e) {
    var a = l.deletions;
    if (a !== null)
      for (var n = 0; n < a.length; n++) {
        var u = a[n], i = t, c = l, f = c;
        t: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if ($e(f.type)) {
                Gt = f.stateNode, El = !1;
                break t;
              }
              break;
            case 5:
              Gt = f.stateNode, El = !1;
              break t;
            case 3:
            case 4:
              Gt = f.stateNode.containerInfo, El = !0;
              break t;
          }
          f = f.return;
        }
        if (Gt === null) throw Error(s(160));
        M0(i, c, u), Gt = null, El = !1, i = u.alternate, i !== null && (i.return = null), u.return = null;
      }
    if (l.subtreeFlags & 13886)
      for (l = l.child; l !== null; )
        R0(l, t, e), l = l.sibling;
  }
  var $l = null;
  function R0(t, l, e) {
    var a = t.alternate, n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (n & 4 && (a = t.updateQueue, a = a !== null ? a.events : null, a !== null))
          for (var u = 0; u < a.length; u++) {
            var i = a[u];
            i.ref.impl = i.nextImpl;
          }
        yl(l, t, e), bl(t), n & 4 && (Xe(3, t, t.return), Ln(3, t), Xe(5, t, t.return));
        break;
      case 1:
        yl(l, t, e), bl(t), n & 512 && (zt || a === null || ol(a, a.return)), n & 64 && el && (t = t.updateQueue, t !== null && (l = t.callbacks, l !== null && (e = t.shared.hiddenCallbacks, t.shared.hiddenCallbacks = e === null ? l : e.concat(l))));
        break;
      case 26:
        if (u = $l, yl(l, t, e), bl(t), n & 512 && (zt || a === null || ol(a, a.return)), n & 4)
          if (n = a !== null ? a.memoizedState : null, e = t.memoizedState, a === null)
            if (e === null)
              if (t.stateNode === null)
                if (el)
                  t.stateNode = vd(
                    t.type,
                    t.memoizedProps,
                    l.containerInfo,
                    t
                  );
                else {
                  t: {
                    l = t.type, e = t.memoizedProps, n = u.ownerDocument || u;
                    l: switch (l) {
                      case "title":
                        a = n.getElementsByTagName("title")[0], (!a || a[Sn] || a[il] || a.namespaceURI === "http://www.w3.org/2000/svg" || a.hasAttribute("itemprop")) && (a = n.createElement(l), n.head.insertBefore(
                          a,
                          n.querySelector("head > title")
                        )), rl(a, l, e), a[il] = t, tl(a), l = a;
                        break t;
                      case "link":
                        if (u = Yd(
                          "link",
                          "href",
                          n
                        ).get(l + (e.href || ""))) {
                          for (i = 0; i < u.length; i++)
                            if (a = u[i], a.getAttribute("href") === (e.href == null || e.href === "" ? null : e.href) && a.getAttribute("rel") === (e.rel == null ? null : e.rel) && a.getAttribute("title") === (e.title == null ? null : e.title) && a.getAttribute("crossorigin") === (e.crossOrigin == null ? null : e.crossOrigin)) {
                              u.splice(i, 1);
                              break l;
                            }
                        }
                        a = n.createElement(l), rl(a, l, e), n.head.appendChild(a);
                        break;
                      case "meta":
                        if (u = Yd(
                          "meta",
                          "content",
                          n
                        ).get(l + (e.content || ""))) {
                          for (i = 0; i < u.length; i++)
                            if (a = u[i], a.getAttribute("content") === (e.content == null ? null : "" + e.content) && a.getAttribute("name") === (e.name == null ? null : e.name) && a.getAttribute("property") === (e.property == null ? null : e.property) && a.getAttribute("http-equiv") === (e.httpEquiv == null ? null : e.httpEquiv) && a.getAttribute("charset") === (e.charSet == null ? null : e.charSet)) {
                              u.splice(i, 1);
                              break l;
                            }
                        }
                        a = n.createElement(l), rl(a, l, e), n.head.appendChild(a);
                        break;
                      default:
                        throw Error(s(468, l));
                    }
                    a[il] = t, tl(a), l = a;
                  }
                  t.stateNode = l;
                }
              else
                el || ys(u, t.type, t.stateNode);
            else
              t.stateNode = Bd(
                u,
                e,
                t.memoizedProps
              );
          else
            n !== e ? (n === null ? (l = a.stateNode, l === null || zt || l.parentNode.removeChild(l)) : n.count--, e === null ? el || ys(u, t.type, t.stateNode) : Bd(u, e, t.memoizedProps)) : e === null && t.stateNode !== null && Ef(
              t,
              t.memoizedProps,
              a.memoizedProps
            );
        break;
      case 27:
        yl(l, t, e), bl(t), n & 512 && (zt || a === null || ol(a, a.return)), a !== null && n & 4 && Ef(
          t,
          t.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (u = ue, ue = !1, yl(l, t, e), ue = u, bl(t), n & 512 && (zt || a === null || ol(a, a.return)), t.flags & 32) {
          l = t.stateNode;
          try {
            xa(l, ""), St = !0;
          } catch (y) {
            Dt(t, t.return, y);
          }
        }
        n & 4 && t.stateNode != null && (l = t.memoizedProps, Ef(
          t,
          l,
          a !== null ? a.memoizedProps : l
        )), n & 1024 && (Df = !0);
        break;
      case 6:
        if (yl(l, t, e), bl(t), n & 4) {
          if (t.stateNode === null)
            throw Error(s(162));
          l = t.memoizedProps, e = t.stateNode;
          try {
            e.nodeValue = l, St = !0;
          } catch (y) {
            Dt(t, t.return, y);
          }
        }
        break;
      case 3:
        if (St = !1, Ui = null, u = $l, $l = eu(l.containerInfo), yl(l, t, e), $l = u, bl(t), n & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            hn(l.containerInfo);
          } catch (y) {
            Dt(t, t.return, y);
          }
        Df && (Df = !1, U0(t)), St = !1;
        break;
      case 4:
        n = ue, ue = el, a = Ws(), u = $l, $l = eu(
          t.stateNode.containerInfo
        ), yl(l, t, e), bl(t), $l = u, St && Jn && (mi = !0), St = a, ue = n;
        break;
      case 12:
        yl(l, t, e), bl(t);
        break;
      case 31:
        yl(l, t, e), bl(t), n & 4 && (l = t.updateQueue, l !== null && (t.updateQueue = null, yi(t, l)));
        break;
      case 13:
        yl(l, t, e), bl(t), t.child.flags & 8192 && t.memoizedState !== null != (a !== null && a.memoizedState !== null) && (pi = Nl()), n & 4 && (l = t.updateQueue, l !== null && (t.updateQueue = null, yi(t, l)));
        break;
      case 22:
        u = t.memoizedState !== null, i = a !== null && a.memoizedState !== null;
        var c = el, f = zt, v = ue;
        el = c || u, ue = v || u, zt = f || i, yl(l, t, e), zt = f, ue = v, el = c, bl(t), n & 8192 && (l = t.stateNode, l._visibility = u ? l._visibility & -2 : l._visibility | 1, !u || a === null || i || el || zt || (l = i || zt, e = el, a = zt, el = u || el, zt = l, Qe(t, 2), el = e, zt = a), !u && ue || Uf(t, u)), n & 4 && (l = t.updateQueue, l !== null && (e = l.retryQueue, e !== null && (l.retryQueue = null, yi(t, e))));
        break;
      case 19:
        yl(l, t, e), bl(t), n & 4 && (l = t.updateQueue, l !== null && (t.updateQueue = null, yi(t, l)));
        break;
      case 30:
        n & 512 && (zt || a === null || ol(a, a.return)), n = Ws(), u = Jn, i = (e & 335544064) === e, c = t.memoizedProps, Jn = i && ve(
          c.default,
          c.update
        ) !== "none", yl(l, t, e), bl(t), i && a !== null && St && (t.flags |= 4), Jn = u, St = n;
        break;
      case 21:
        break;
      case 7:
        n & 512 && (zt || a === null || ol(a, a.return)), a && a.stateNode !== null && (a.stateNode._fragmentFiber = t);
      default:
        yl(l, t, e), bl(t);
    }
  }
  function bl(t) {
    var l = t.flags;
    if (l & 2) {
      try {
        for (var e, a = t.return; a !== null; ) {
          if (g0(a)) {
            e = a;
            break;
          }
          a = a.return;
        }
        a = null;
        for (var n = t.return; n !== null; ) {
          if (pf(n)) {
            var u = n.stateNode;
            a === null ? a = [u] : a.push(u);
          }
          if (Sf(n)) break;
          n = n.return;
        }
        var i = a;
        if (e == null) throw Error(s(160));
        switch (e.tag) {
          case 27:
            var c = e.stateNode, f = _f(t);
            ri(
              t,
              f,
              c,
              i
            );
            break;
          case 5:
            var v = e.stateNode;
            e.flags & 32 && (xa(v, ""), e.flags &= -33);
            var y = _f(t);
            ri(
              t,
              y,
              v,
              i
            );
            break;
          case 3:
          case 4:
            var _ = e.stateNode.containerInfo, d = _f(t);
            zf(
              t,
              d,
              _,
              i
            );
            break;
          default:
            throw Error(s(161));
        }
      } catch (g) {
        Dt(t, t.return, g);
      }
      t.flags &= -3;
    }
    l & 4096 && (t.flags &= -4097);
  }
  function U0(t) {
    if (t.subtreeFlags & 1024)
      for (t = t.child; t !== null; ) {
        var l = t;
        U0(l), l.tag === 5 && l.flags & 1024 && (l = l.stateNode, dn = !0, l.reset(), dn = !1), t = t.sibling;
      }
  }
  function $a(t, l) {
    if (l.subtreeFlags & 9270)
      for (l = l.child; l !== null; )
        C0(l, t), l = l.sibling;
    else _0(l);
  }
  function C0(t, l) {
    var e = t.alternate;
    if (e === null) Nf(t, !1);
    else
      switch (t.tag) {
        case 3:
          if (Rf = ie = !1, S0(), $a(l, t), !ie && !mi) {
            if (t = ae, t !== null)
              for (var a = 0; a < t.length; a += 3) {
                e = t[a];
                var n = t[a + 1];
                pd(e, t[a + 2]), e = e.ownerDocument.documentElement, e !== null && e.animate(
                  { opacity: [0, 0], pointerEvents: ["none", "none"] },
                  {
                    duration: 0,
                    fill: "forwards",
                    pseudoElement: "::view-transition-group(" + n + ")"
                  }
                );
              }
            t = l.containerInfo, t = t.nodeType === 9 ? t.documentElement : t.ownerDocument.documentElement, t !== null && t.style.viewTransitionName === "" && (t.style.viewTransitionName = "none", t.animate(
              { opacity: [0, 0], pointerEvents: ["none", "none"] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition-group(root)"
              }
            ), t.animate(
              { width: [0, 0], height: [0, 0] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition"
              }
            )), Rf = !0;
          }
          ae = null;
          break;
        case 5:
          $a(l, t);
          break;
        case 4:
          a = ie, ie = !1, $a(l, t), ie && (mi = !0), ie = a;
          break;
        case 22:
          t.memoizedState === null && (e.memoizedState !== null ? Nf(t, !1) : $a(l, t));
          break;
        case 30:
          a = ie, n = S0(), ie = !1, $a(l, t), ie && (t.flags |= 4);
          var u = t.memoizedProps, i = t.stateNode;
          l = he(u, i), i = he(e.memoizedProps, i);
          var c = ve(u.default, u.update);
          c === "none" ? l = !1 : (u = e.memoizedState, e.memoizedState = null, e = t.child, Tl = 0, l = xf(
            t,
            e,
            l,
            i,
            c,
            u,
            !0
          ), Tl !== (u === null ? 0 : u.length) && (t.flags |= 32)), (t.flags & 4) !== 0 && l ? (ln(
            t,
            t.memoizedProps.onUpdate
          ), ae = n) : n !== null && (n.push.apply(n, ae), ae = n), ie = (t.flags & 32) !== 0 ? !0 : a;
          break;
        default:
          $a(l, t);
      }
  }
  function ce(t, l) {
    if (l.subtreeFlags & 8772)
      for (l = l.child; l !== null; )
        N0(t, l.alternate, l), l = l.sibling;
  }
  function Qe(t, l) {
    for (t = t.child; t !== null; ) {
      var e = t, a = l;
      switch (e.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Xe(4, e, e.return), Qe(
            e,
            a
          );
          break;
        case 1:
          ol(e, e.return);
          var n = e.stateNode;
          typeof n.componentWillUnmount == "function" && v0(
            e,
            e.return,
            n
          ), Qe(
            e,
            a
          );
          break;
        case 27:
          (a & 2) !== 0 && Ud(
            e.stateNode,
            e.type,
            e.memoizedProps
          );
        case 5:
          ol(e, e.return), e.tag !== 5 && e.tag !== 27 || Kn(e), Qe(
            e,
            a
          );
          break;
        case 6:
          Kn(e);
          break;
        case 26:
          ol(e, e.return), n = e.stateNode, e.memoizedState !== null || n === null || zt || n.parentNode.removeChild(n), Qe(
            e,
            a
          );
          break;
        case 22:
          e.memoizedState === null && Qe(
            e,
            a
          );
          break;
        case 30:
          ol(e, e.return), Qe(
            e,
            a
          );
          break;
        case 7:
          ol(e, e.return);
        default:
          Qe(
            e,
            a
          );
      }
      t = t.sibling;
    }
  }
  function kl(t, l, e) {
    for (e = (l.subtreeFlags & 8772) !== 0 ? e : e & -2, l = l.child; l !== null; ) {
      var a = l.alternate, n = t, u = l, i = u.flags, c = (e & 1) !== 0;
      switch (u.tag) {
        case 0:
        case 11:
        case 15:
          kl(
            n,
            u,
            e
          ), Ln(4, u);
          break;
        case 1:
          if (kl(
            n,
            u,
            e
          ), a = u, n = a.stateNode, typeof n.componentDidMount == "function")
            try {
              n.componentDidMount();
            } catch (y) {
              Dt(a, a.return, y);
            }
          if (a = u, n = a.updateQueue, n !== null) {
            var f = a.stateNode;
            try {
              var v = n.shared.hiddenCallbacks;
              if (v !== null)
                for (n.shared.hiddenCallbacks = null, n = 0; n < v.length; n++)
                  lr(v[n], f);
            } catch (y) {
              Dt(a, a.return, y);
            }
          }
          c && i & 64 && h0(u), ee(u, u.return);
          break;
        case 27:
          (e & 2) !== 0 && y0(u);
        case 5:
          u.tag !== 5 && u.tag !== 27 || m0(u), kl(
            n,
            u,
            e
          ), c && a === null && i & 4 && Tf(u), ee(u, u.return);
          break;
        case 6:
          m0(u);
          break;
        case 26:
          f = u.stateNode, u.memoizedState !== null || f === null || el || ys(
            eu(f.ownerDocument),
            u.type,
            f
          ), kl(
            n,
            u,
            e
          ), c && a === null && i & 4 && Tf(u), ee(u, u.return);
          break;
        case 12:
          kl(
            n,
            u,
            e
          );
          break;
        case 31:
          kl(
            n,
            u,
            e
          ), c && i & 4 && x0(n, u);
          break;
        case 13:
          kl(
            n,
            u,
            e
          ), c && i & 4 && D0(n, u);
          break;
        case 22:
          u.memoizedState === null && kl(
            n,
            u,
            e
          ), ee(u, u.return);
          break;
        case 30:
          kl(
            n,
            u,
            e
          ), ee(u, u.return);
          break;
        case 7:
          ee(u, u.return);
        default:
          kl(
            n,
            u,
            e
          );
      }
      l = l.sibling;
    }
  }
  function Hf(t, l) {
    var e = null;
    t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), t = null, l.memoizedState !== null && l.memoizedState.cachePool !== null && (t = l.memoizedState.cachePool.pool), t !== e && (t != null && t.refCount++, e != null && Un(e));
  }
  function jf(t, l) {
    t = null, l.alternate !== null && (t = l.alternate.memoizedState.cache), l = l.memoizedState.cache, l !== t && (l.refCount++, t != null && Un(t));
  }
  function Zl(t, l, e, a) {
    var n = (e & 335544064) === e;
    if (l.subtreeFlags & (n ? 10262 : 10256))
      for (l = l.child; l !== null; )
        H0(
          t,
          l,
          e,
          a
        ), l = l.sibling;
    else n && E0(l);
  }
  function H0(t, l, e, a) {
    var n = (e & 335544064) === e;
    n && l.alternate === null && l.return !== null && l.return.alternate !== null && vi(l);
    var u = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Zl(
          t,
          l,
          e,
          a
        ), u & 2048 && Ln(9, l);
        break;
      case 1:
        Zl(
          t,
          l,
          e,
          a
        );
        break;
      case 3:
        Zl(
          t,
          l,
          e,
          a
        ), n && Rf && (t = t.containerInfo, t = t.nodeType === 9 ? t.body : t.nodeName === "HTML" ? t.ownerDocument.body : t, t.style.viewTransitionName === "root" && (t.style.viewTransitionName = ""), t = t.ownerDocument.documentElement, t !== null && t.style.viewTransitionName === "none" && (t.style.viewTransitionName = "")), u & 2048 && (u = null, l.alternate !== null && (u = l.alternate.memoizedState.cache), l = l.memoizedState.cache, l !== u && (l.refCount++, u != null && Un(u)));
        break;
      case 12:
        if (u & 2048) {
          Zl(
            t,
            l,
            e,
            a
          ), u = l.stateNode;
          try {
            var i = l.memoizedProps, c = i.id, f = i.onPostCommit;
            typeof f == "function" && f(
              c,
              l.alternate === null ? "mount" : "update",
              u.passiveEffectDuration,
              -0
            );
          } catch (v) {
            Dt(l, l.return, v);
          }
        } else
          Zl(
            t,
            l,
            e,
            a
          );
        break;
      case 31:
        Zl(
          t,
          l,
          e,
          a
        );
        break;
      case 13:
        Zl(
          t,
          l,
          e,
          a
        );
        break;
      case 23:
        break;
      case 22:
        i = l.stateNode, c = l.alternate, l.memoizedState !== null ? (n && c !== null && c.memoizedState === null && vi(c), i._visibility & 2 ? Zl(
          t,
          l,
          e,
          a
        ) : $n(
          t,
          l
        )) : (n && c !== null && c.memoizedState !== null && vi(l), i._visibility & 2 ? Zl(
          t,
          l,
          e,
          a
        ) : (i._visibility |= 2, ka(
          t,
          l,
          e,
          a,
          (l.subtreeFlags & 10256) !== 0 || !1
        ))), u & 2048 && Hf(c, l);
        break;
      case 24:
        Zl(
          t,
          l,
          e,
          a
        ), u & 2048 && jf(l.alternate, l);
        break;
      case 30:
        n && (u = l.alternate, u !== null && (ne(u.child, !0), ne(l.child, !0))), Zl(
          t,
          l,
          e,
          a
        );
        break;
      default:
        Zl(
          t,
          l,
          e,
          a
        );
    }
  }
  function ka(t, l, e, a, n) {
    for (n = n && ((l.subtreeFlags & 10256) !== 0 || !1), l = l.child; l !== null; ) {
      var u = t, i = l, c = e, f = a, v = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          ka(
            u,
            i,
            c,
            f,
            n
          ), Ln(8, i);
          break;
        case 23:
          break;
        case 22:
          var y = i.stateNode;
          i.memoizedState !== null ? y._visibility & 2 ? ka(
            u,
            i,
            c,
            f,
            n
          ) : $n(
            u,
            i
          ) : (y._visibility |= 2, ka(
            u,
            i,
            c,
            f,
            n
          )), n && v & 2048 && Hf(
            i.alternate,
            i
          );
          break;
        case 24:
          ka(
            u,
            i,
            c,
            f,
            n
          ), n && v & 2048 && jf(i.alternate, i);
          break;
        default:
          ka(
            u,
            i,
            c,
            f,
            n
          );
      }
      l = l.sibling;
    }
  }
  function $n(t, l) {
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; ) {
        var e = t, a = l, n = a.flags;
        switch (a.tag) {
          case 22:
            $n(e, a), n & 2048 && Hf(
              a.alternate,
              a
            );
            break;
          case 24:
            $n(e, a), n & 2048 && jf(a.alternate, a);
            break;
          default:
            $n(e, a);
        }
        l = l.sibling;
      }
  }
  var ba = 8192;
  function Sa(t, l, e) {
    if (t.subtreeFlags & ba)
      for (t = t.child; t !== null; )
        j0(
          t,
          l,
          e
        ), t = t.sibling;
  }
  function j0(t, l, e) {
    switch (t.tag) {
      case 26:
        Sa(
          t,
          l,
          e
        ), t.flags & ba && (t.memoizedState !== null ? o1(
          e,
          $l,
          t.memoizedState,
          t.memoizedProps
        ) : (t = t.stateNode, (l & 335544128) === l && Qd(e, t)));
        break;
      case 5:
        Sa(
          t,
          l,
          e
        ), t.flags & ba && (t = t.stateNode, (l & 335544128) === l && Qd(e, t));
        break;
      case 3:
      case 4:
        var a = $l;
        $l = eu(t.stateNode.containerInfo), Sa(
          t,
          l,
          e
        ), $l = a;
        break;
      case 22:
        t.memoizedState === null && (a = t.alternate, a !== null && a.memoizedState !== null ? (a = ba, ba = 16777216, Sa(
          t,
          l,
          e
        ), ba = a) : Sa(
          t,
          l,
          e
        ));
        break;
      case 30:
        if ((t.flags & ba) !== 0 && (a = t.memoizedProps.name, a != null && a !== "auto")) {
          var n = t.stateNode;
          n.paired = null, Rl === null && (Rl = /* @__PURE__ */ new Map()), Rl.set(a, n);
        }
        Sa(
          t,
          l,
          e
        );
        break;
      default:
        Sa(
          t,
          l,
          e
        );
    }
  }
  function q0(t) {
    var l = t.alternate;
    if (l !== null && (t = l.child, t !== null)) {
      l.child = null;
      do
        l = t.sibling, t.sibling = null, t = l;
      while (t !== null);
    }
  }
  function kn(t) {
    var l = t.deletions;
    if ((t.flags & 16) !== 0) {
      if (l !== null)
        for (var e = 0; e < l.length; e++) {
          var a = l[e];
          al = a, Y0(
            a,
            t
          );
        }
      q0(t);
    }
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        B0(t), t = t.sibling;
  }
  function B0(t) {
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        kn(t), t.flags & 2048 && Xe(9, t, t.return);
        break;
      case 3:
        kn(t);
        break;
      case 12:
        kn(t);
        break;
      case 22:
        var l = t.stateNode;
        t.memoizedState !== null && l._visibility & 2 && (t.return === null || t.return.tag !== 13) ? (l._visibility &= -3, bi(t)) : kn(t);
        break;
      default:
        kn(t);
    }
  }
  function bi(t) {
    var l = t.deletions;
    if ((t.flags & 16) !== 0) {
      if (l !== null)
        for (var e = 0; e < l.length; e++) {
          var a = l[e];
          al = a, Y0(
            a,
            t
          );
        }
      q0(t);
    }
    for (t = t.child; t !== null; ) {
      switch (l = t, l.tag) {
        case 0:
        case 11:
        case 15:
          Xe(8, l, l.return), bi(l);
          break;
        case 22:
          e = l.stateNode, e._visibility & 2 && (e._visibility &= -3, bi(l));
          break;
        default:
          bi(l);
      }
      t = t.sibling;
    }
  }
  function Y0(t, l) {
    for (; al !== null; ) {
      var e = al;
      switch (e.tag) {
        case 0:
        case 11:
        case 15:
          Xe(8, e, l);
          break;
        case 23:
        case 22:
          if (e.memoizedState !== null && e.memoizedState.cachePool !== null) {
            var a = e.memoizedState.cachePool.pool;
            a != null && a.refCount++;
          }
          break;
        case 24:
          Un(e.memoizedState.cache);
      }
      if (a = e.child, a !== null) a.return = e, al = a;
      else
        t: for (e = t; al !== null; ) {
          a = al;
          var n = a.sibling, u = a.return;
          if (A0(a), a === e) {
            al = null;
            break t;
          }
          if (n !== null) {
            n.return = u, al = n;
            break t;
          }
          al = u;
        }
    }
  }
  var um = {
    getCacheForType: function(t) {
      var l = cl(Jt), e = l.data.get(t);
      return e === void 0 && (e = t(), l.data.set(t, e)), e;
    },
    cacheSignal: function() {
      return cl(Jt).controller.signal;
    }
  }, im = typeof WeakMap == "function" ? WeakMap : Map, _t = 0, qt = null, ct = null, ot = 0, xt = 0, Ul = null, Ze = !1, Fa = !1, qf = !1, _e = 0, Lt = 0, Ve = 0, pa = 0, Si = 0, Cl = 0, Wa = 0, Fn = null, _l = null, Bf = !1, pi = 0, w0 = 0, Ti = 1 / 0, Ei = null, Le = null, Xt = 0, Fl = null, Ta = null, fe = 0, Yf = 0, wf = null, G0 = null, Ia = null, Pa = null, tn = null, Wn = 0, _i = null;
  function Hl() {
    return (_t & 2) !== 0 && ot !== 0 ? ot & -ot : C.T !== null ? kf() : Qs();
  }
  function X0() {
    if (Cl === 0)
      if ((ot & 536870912) === 0 || et) {
        var t = yu;
        yu <<= 1, (yu & 3932160) === 0 && (yu = 262144), Cl = t;
      } else Cl = 536870912;
    return t = fl.current, t !== null && (t.flags |= 32), Cl;
  }
  function ln(t, l) {
    if (l != null) {
      var e = t.stateNode, a = e.ref;
      a === null && (a = e.ref = Td(
        he(t.memoizedProps, e)
      )), Pa === null && (Pa = []), Pa.push(l.bind(null, a));
    }
  }
  function zl(t, l, e) {
    (t === qt && (xt === 2 || xt === 9) || t.cancelPendingCommit !== null) && (en(t, 0), Ke(
      t,
      ot,
      Cl,
      !1
    )), bn(t, e), ((_t & 2) === 0 || t !== qt) && (t === qt && ((_t & 2) === 0 && (pa |= e), Lt === 4 && Ke(
      t,
      ot,
      Cl,
      !1
    )), se(t));
  }
  function Q0(t, l, e) {
    if ((_t & 6) !== 0) throw Error(s(327));
    var a = !e && (l & 127) === 0 && (l & t.expiredLanes) === 0 || yn(t, l), n = a ? sm(t, l) : Xf(t, l, !0), u = a;
    do {
      if (n === 0) {
        Fa && !a && Ke(t, l, 0, !1);
        break;
      } else {
        if (e = t.current.alternate, u && !cm(e)) {
          n = Xf(t, l, !1), u = !1;
          continue;
        }
        if (n === 2) {
          if (u = l, t.errorRecoveryDisabledLanes & u)
            var i = 0;
          else
            i = t.pendingLanes & -536870913, i = i !== 0 ? i : i & 536870912 ? 536870912 : 0;
          if (i !== 0) {
            l = i;
            t: {
              var c = t;
              n = Fn;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (en(c, i).flags |= 256), i = Xf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (qf && !f) {
                  c.errorRecoveryDisabledLanes |= u, pa |= u, n = 4;
                  break t;
                }
                u = _l, _l = n, u !== null && (_l === null ? _l = u : _l.push.apply(
                  _l,
                  u
                ));
              }
              n = i;
            }
            if (u = !1, n !== 2) continue;
          }
        }
        if (n === 1) {
          en(t, 0), Ke(t, l, 0, !0);
          break;
        }
        t: {
          switch (a = t, u = n, u) {
            case 0:
            case 1:
              throw Error(s(345));
            case 4:
              if ((l & 4194048) !== l && (l & 62914560) !== l)
                break;
            case 6:
              Ke(
                a,
                l,
                Cl,
                !Ze
              );
              break t;
            case 2:
              _l = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(s(329));
          }
          if ((l & 62914560) === l && (n = pi + 300 - Nl(), 10 < n)) {
            if (Ke(
              a,
              l,
              Cl,
              !Ze
            ), Su(a, 0, !0) !== 0) break t;
            fe = l, a.timeoutHandle = is(
              Z0.bind(
                null,
                a,
                e,
                _l,
                Ei,
                Bf,
                l,
                Cl,
                pa,
                Wa,
                Ze,
                u,
                "Throttled",
                -0,
                0
              ),
              n
            );
            break t;
          }
          Z0(
            a,
            e,
            _l,
            Ei,
            Bf,
            l,
            Cl,
            pa,
            Wa,
            Ze,
            u,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    se(t);
  }
  function Z0(t, l, e, a, n, u, i, c, f, v, y, _, d, g) {
    t.timeoutHandle = -1;
    var D = l.subtreeFlags, B = (u & 335544064) === u;
    if (_ = null, (B || D & 8192 || (D & 16785408) === 16785408) && (_ = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: Pl
    }, Rl = null, j0(
      l,
      u,
      _
    ), B && (D = _, B = t.containerInfo, B = (B.nodeType === 9 ? B : B.ownerDocument).__reactViewTransition, B != null && (D.count++, D.waitingForViewTransition = !0, D = uu.bind(D), B.finished.then(D, D))), D = (u & 62914560) === u ? pi - Nl() : (u & 4194048) === u ? w0 - Nl() : 0, D = r1(
      _,
      D
    ), D !== null)) {
      fe = u, t.cancelPendingCommit = D(
        W0.bind(
          null,
          t,
          l,
          u,
          e,
          a,
          n,
          i,
          c,
          f,
          v,
          y,
          _,
          null,
          d,
          g
        )
      ), Ke(t, u, i, !v);
      return;
    }
    W0(
      t,
      l,
      u,
      e,
      a,
      n,
      i,
      c,
      f,
      v,
      y,
      _
    );
  }
  function cm(t) {
    for (var l = t; ; ) {
      var e = l.tag;
      if ((e === 0 || e === 11 || e === 15) && l.flags & 16384 && (e = l.updateQueue, e !== null && (e = e.stores, e !== null)))
        for (var a = 0; a < e.length; a++) {
          var n = e[a], u = n.getSnapshot;
          n = n.value;
          try {
            if (!xl(u(), n)) return !1;
          } catch {
            return !1;
          }
        }
      if (e = l.child, l.subtreeFlags & 16384 && e !== null)
        e.return = l, l = e;
      else {
        if (l === t) break;
        for (; l.sibling === null; ) {
          if (l.return === null || l.return === t) return !0;
          l = l.return;
        }
        l.sibling.return = l.return, l = l.sibling;
      }
    }
    return !0;
  }
  function Ke(t, l, e, a) {
    l = Bs(t, l), l &= ~Si, l &= ~pa, t.suspendedLanes |= l, t.pingedLanes &= ~l, a && (t.warmLanes |= l), a = t.expirationTimes;
    for (var n = l; 0 < n; ) {
      var u = 31 - Al(n), i = 1 << u;
      a[u] = -1, n &= ~i;
    }
    e !== 0 && ws(t, e, l);
  }
  function zi() {
    return (_t & 6) === 0 ? (In(0), !1) : !0;
  }
  function Gf() {
    if (ct !== null) {
      if (xt === 0)
        var t = ct.return;
      else
        t = ct, ye = fa = null, Jc(t), Qa = null, jn = 0, t = ct;
      for (; t !== null; )
        d0(t.alternate, t), t = t.return;
      ct = null;
    }
  }
  function en(t, l) {
    var e = t.timeoutHandle;
    return e !== -1 && (t.timeoutHandle = -1, Rm(e)), e = t.cancelPendingCommit, e !== null && (t.cancelPendingCommit = null, e()), fe = 0, Gf(), qt = t, ct = e = me(t.current, null), ot = l, xt = 0, Ul = null, Ze = !1, Fa = yn(t, l), qf = !1, Wa = Cl = Si = pa = Ve = Lt = 0, _l = Fn = null, Bf = !1, _e = Bs(t, l), Uu(), e;
  }
  function V0(t, l) {
    P = null, C.H = ai, l === Xa || l === Zu ? (l = Wo(), xt = 3) : l === Hc ? (l = Wo(), xt = 4) : xt = l === sf ? 8 : l !== null && typeof l == "object" && typeof l.then == "function" ? 6 : 1, Ul = l, ct === null && (Lt = 1, ni(
      t,
      wl(l, t.current)
    ));
  }
  function L0() {
    var t = fl.current;
    return t === null ? !0 : (ot & 4194048) === ot ? hl === null : (ot & 62914560) === ot || (ot & 536870912) !== 0 ? t === hl : !1;
  }
  function K0() {
    var t = C.H;
    return C.H = ai, t === null ? ai : t;
  }
  function J0() {
    var t = C.A;
    return C.A = um, t;
  }
  function Ni() {
    Lt = 4, Ze || (ot & 4194048) !== ot && fl.current !== null || (Fa = !0), (Ve & 134217727) === 0 && (pa & 134217727) === 0 || qt === null || Ke(
      qt,
      ot,
      Cl,
      !1
    );
  }
  function Xf(t, l, e) {
    var a = _t;
    _t |= 2;
    var n = K0(), u = J0();
    (qt !== t || ot !== l) && (Ei = null, en(t, l)), l = !1;
    var i = Lt;
    t: do
      try {
        if (xt !== 0 && ct !== null) {
          var c = ct, f = Ul;
          switch (xt) {
            case 8:
              Gf(), i = 6;
              break t;
            case 3:
            case 2:
            case 9:
            case 6:
              fl.current === null && (l = !0);
              var v = xt;
              if (xt = 0, Ul = null, an(t, c, f, v), e && Fa) {
                i = 0;
                break t;
              }
              break;
            default:
              v = xt, xt = 0, Ul = null, an(t, c, f, v);
          }
        }
        fm(), i = Lt;
        break;
      } catch (y) {
        V0(t, y);
      }
    while (!0);
    return l && t.shellSuspendCounter++, ye = fa = null, _t = a, C.H = n, C.A = u, ct === null && (qt = null, ot = 0, Uu()), i;
  }
  function fm() {
    for (; ct !== null; ) $0(ct);
  }
  function sm(t, l) {
    var e = _t;
    _t |= 2;
    var a = K0(), n = J0();
    qt !== t || ot !== l ? (Ei = null, Ti = Nl() + 500, en(t, l)) : Fa = yn(
      t,
      l
    );
    t: do
      try {
        if (xt !== 0 && ct !== null) {
          l = ct;
          var u = Ul;
          l: switch (xt) {
            case 1:
              xt = 0, Ul = null, an(t, l, u, 1);
              break;
            case 2:
            case 9:
              if (ko(u)) {
                xt = 0, Ul = null, k0(l);
                break;
              }
              l = function() {
                xt !== 2 && xt !== 9 || qt !== t || (xt = 7), se(t);
              }, u.then(l, l);
              break t;
            case 3:
              xt = 7;
              break t;
            case 4:
              xt = 5;
              break t;
            case 7:
              ko(u) ? (xt = 0, Ul = null, k0(l)) : (xt = 0, Ul = null, an(t, l, u, 7));
              break;
            case 5:
              var i = null;
              switch (ct.tag) {
                case 26:
                  i = ct.memoizedState;
                case 5:
                case 27:
                  var c = ct;
                  if (i ? Gd(i) : c.stateNode.complete) {
                    xt = 0, Ul = null;
                    var f = c.sibling;
                    if (f !== null) ct = f;
                    else {
                      var v = c.return;
                      v !== null ? (ct = v, Oi(v)) : ct = null;
                    }
                    break l;
                  }
              }
              xt = 0, Ul = null, an(t, l, u, 5);
              break;
            case 6:
              xt = 0, Ul = null, an(t, l, u, 6);
              break;
            case 8:
              Gf(), Lt = 6;
              break t;
            default:
              throw Error(s(462));
          }
        }
        om();
        break;
      } catch (y) {
        V0(t, y);
      }
    while (!0);
    return ye = fa = null, C.H = a, C.A = n, _t = e, ct !== null ? 0 : (qt = null, ot = 0, Uu(), Lt);
  }
  function om() {
    for (; ct !== null && !Ah(); )
      $0(ct);
  }
  function $0(t) {
    var l = o0(t.alternate, t, _e);
    t.memoizedProps = t.pendingProps, l === null ? Oi(t) : ct = l;
  }
  function k0(t) {
    var l = t, e = l.alternate;
    switch (l.tag) {
      case 15:
      case 0:
        l = a0(
          e,
          l,
          l.pendingProps,
          l.type,
          void 0,
          ot
        );
        break;
      case 11:
        l = a0(
          e,
          l,
          l.pendingProps,
          l.type.render,
          l.ref,
          ot
        );
        break;
      case 5:
        Jc(l);
        var a = l;
        a === ll && (et ? (Yu(a), a.tag === 5 && a.stateNode != null && (Yt = a.stateNode)) : (Yu(a), et = !0));
      default:
        d0(e, l), l = ct = Yo(l, _e), l = o0(e, l, _e);
    }
    t.memoizedProps = t.pendingProps, l === null ? Oi(t) : ct = l;
  }
  function an(t, l, e, a) {
    ye = fa = null, Jc(l), Qa = null, jn = 0;
    var n = l.return;
    try {
      if (Wv(
        t,
        n,
        l,
        e,
        ot
      )) {
        Lt = 1, ni(
          t,
          wl(e, t.current)
        ), ct = null;
        return;
      }
    } catch (u) {
      if (n !== null) throw ct = n, u;
      Lt = 1, ni(
        t,
        wl(e, t.current)
      ), ct = null;
      return;
    }
    l.flags & 32768 ? (et || a === 1 ? t = !0 : Fa || (ot & 536870912) !== 0 ? t = !1 : (Ze = t = !0, (a === 2 || a === 9 || a === 3 || a === 6) && (a = fl.current, a !== null && a.tag === 13 && (a.flags |= 16384))), F0(l, t)) : Oi(l);
  }
  function Oi(t) {
    var l = t;
    do {
      if ((l.flags & 32768) !== 0) {
        F0(
          l,
          Ze
        );
        return;
      }
      t = l.return;
      var e = lm(
        l.alternate,
        l,
        _e
      );
      if (e !== null) {
        ct = e;
        return;
      }
      if (l = l.sibling, l !== null) {
        ct = l;
        return;
      }
      ct = l = t;
    } while (l !== null);
    Lt === 0 && (Lt = 5);
  }
  function F0(t, l) {
    do {
      var e = em(t.alternate, t);
      if (e !== null) {
        e.flags &= 32767, ct = e;
        return;
      }
      if (e = t.return, e !== null && (e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null), !l && (t = t.sibling, t !== null)) {
        ct = t;
        return;
      }
      ct = t = e;
    } while (t !== null);
    Lt = 6, ct = null;
  }
  function W0(t, l, e, a, n, u, i, c, f, v, y, _) {
    t.cancelPendingCommit = null;
    do
      Ai();
    while (Xt !== 0);
    if ((_t & 6) !== 0) throw Error(s(327));
    if (l !== null) {
      if (l === t.current) throw Error(s(177));
      t === qt && (ct = qt = null, ot = 0), Ta = l, Fl = t, fe = e, wf = n, G0 = a, rm(
        t,
        l,
        e,
        i,
        c,
        f,
        _
      );
    }
  }
  function rm(t, l, e, a, n, u, i) {
    var c = l.lanes | l.childLanes;
    if (Yf = c, c |= Tc, Bh(
      t,
      e,
      c,
      a,
      n,
      u
    ), Pa = null, (e & 335544064) === e ? (tn = wv(t), a = 10262) : (tn = null, a = 10256), (l.subtreeFlags & a) !== 0 || (l.flags & a) !== 0 ? (t.callbackNode = null, t.callbackPriority = 0, ym(mu, function() {
      return Lf(), null;
    })) : (t.callbackNode = null, t.callbackPriority = 0), di = !1, a = (l.flags & 13878) !== 0, (l.subtreeFlags & 13878) !== 0 || a) {
      a = C.T, C.T = null, n = z.p, z.p = 2, u = _t, _t |= 4;
      try {
        am(t, l, e);
      } finally {
        _t = u, z.p = n, C.T = a;
      }
    }
    Xt = 1, di ? Ia = Bm(
      i,
      t.containerInfo,
      tn,
      Qf,
      Zf,
      hm,
      Vf,
      Lf,
      dm
    ) : (Qf(), Zf(), Vf());
  }
  function dm(t) {
    if (Xt !== 0) {
      var l = Fl.onRecoverableError;
      l(t, { componentStack: null });
    }
  }
  function hm() {
    Xt === 3 && (Xt = 0, C0(Ta, Fl), Xt = 4);
  }
  function Qf() {
    if (Xt === 1) {
      Xt = 0;
      var t = Fl, l = Ta, e = fe, a = (l.flags & 13878) !== 0;
      if ((l.subtreeFlags & 13878) !== 0 || a) {
        a = C.T, C.T = null;
        var n = z.p;
        z.p = 2;
        var u = _t;
        _t |= 4;
        try {
          Jn = mi = !1, R0(l, t, e), e = as;
          var i = Mo(t.containerInfo), c = e.focusedElem, f = e.selectionRange;
          if (i !== c && c && c.ownerDocument && Ao(
            c.ownerDocument.documentElement,
            c
          )) {
            if (f !== null && gc(c)) {
              var v = f.start, y = f.end;
              if (y === void 0 && (y = v), "selectionStart" in c)
                c.selectionStart = v, c.selectionEnd = Math.min(
                  y,
                  c.value.length
                );
              else {
                var _ = c.ownerDocument || document, d = _ && _.defaultView || window;
                if (d.getSelection) {
                  var g = d.getSelection(), D = c.textContent.length, B = Math.min(f.start, D), tt = f.end === void 0 ? B : Math.min(f.end, D);
                  !g.extend && B > tt && (i = tt, tt = B, B = i);
                  var h = Oo(
                    c,
                    B
                  ), o = Oo(
                    c,
                    tt
                  );
                  if (h && o && (g.rangeCount !== 1 || g.anchorNode !== h.node || g.anchorOffset !== h.offset || g.focusNode !== o.node || g.focusOffset !== o.offset)) {
                    var m = _.createRange();
                    m.setStart(h.node, h.offset), g.removeAllRanges(), B > tt ? (g.addRange(m), g.extend(o.node, o.offset)) : (m.setEnd(o.node, o.offset), g.addRange(m));
                  }
                }
              }
            }
            for (_ = [], g = c; g = g.parentNode; )
              g.nodeType === 1 && _.push({
                element: g,
                left: g.scrollLeft,
                top: g.scrollTop
              });
            for (typeof c.focus == "function" && c.focus(), c = 0; c < _.length; c++) {
              var E = _[c];
              E.element.scrollLeft = E.left, E.element.scrollTop = E.top;
            }
          }
          dn = !!es, as = es = null;
        } finally {
          _t = u, z.p = n, C.T = a;
        }
      }
      t.current = l, Xt = 2;
    }
  }
  function Zf() {
    if (Xt === 2) {
      Xt = 0;
      var t = Fl, l = Ta, e = (l.flags & 8772) !== 0;
      if ((l.subtreeFlags & 8772) !== 0 || e) {
        e = C.T, C.T = null;
        var a = z.p;
        z.p = 2;
        var n = _t;
        _t |= 4;
        try {
          N0(t, l.alternate, l);
        } finally {
          _t = n, z.p = a, C.T = e;
        }
      }
      Xt = 3;
    }
  }
  function Vf() {
    if (Xt === 4 || Xt === 3) {
      Xt = 0;
      var t = Ia;
      Ia = null, Mh();
      var l = Fl, e = Ta, a = fe, n = G0, u = (a & 335544064) === a ? 10262 : 10256;
      if ((e.subtreeFlags & u) !== 0 || (e.flags & u) !== 0 ? Xt = 5 : (Xt = 0, Ta = Fl = null, I0(l, l.pendingLanes)), u = l.pendingLanes, u === 0 && (Le = null), Ii(a), e = e.stateNode, Ol && typeof Ol.onCommitFiberRoot == "function")
        try {
          Ol.onCommitFiberRoot(
            gn,
            e,
            void 0,
            (e.current.flags & 128) === 128
          );
        } catch {
        }
      if (n !== null) {
        e = C.T, u = z.p, z.p = 2, C.T = null;
        try {
          for (var i = l.onRecoverableError, c = 0; c < n.length; c++) {
            var f = n[c];
            i(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          C.T = e, z.p = u;
        }
      }
      if (n = Pa, i = tn, tn = null, n !== null && (Pa = null, i === null && (i = []), t !== null))
        for (f = 0; f < n.length; f++)
          e = (0, n[f])(
            i
          ), e !== void 0 && t.finished.finally(e);
      (fe & 3) !== 0 && Ai(), se(l), u = l.pendingLanes, (a & 261930) !== 0 && (u & 42) !== 0 ? l === _i ? Wn++ : (Wn = 0, _i = l) : (Wn = 0, _i = null), In(0);
    }
  }
  function I0(t, l) {
    (t.pooledCacheLanes &= l) === 0 && (l = t.pooledCache, l != null && (t.pooledCache = null, Un(l)));
  }
  function Ai() {
    return Ia !== null && (Ia.skipTransition(), Ia = null), Qf(), Zf(), Vf(), Lf();
  }
  function Lf() {
    if (Xt !== 5) return !1;
    var t = Fl, l = Yf;
    Yf = 0;
    var e = Ii(fe), a = C.T, n = z.p;
    try {
      z.p = 32 > e ? 32 : e, C.T = null, e = wf, wf = null;
      var u = Fl, i = fe;
      if (Xt = 0, Ta = Fl = null, fe = 0, (_t & 6) !== 0) throw Error(s(331));
      var c = _t;
      if (_t |= 4, B0(u.current), H0(
        u,
        u.current,
        i,
        e
      ), _t = c, In(0, !1), Ol && typeof Ol.onPostCommitFiberRoot == "function")
        try {
          Ol.onPostCommitFiberRoot(gn, u);
        } catch {
        }
      return !0;
    } finally {
      z.p = n, C.T = a, I0(t, l);
    }
  }
  function P0(t, l, e) {
    l = wl(e, l), l = ff(t.stateNode, l, 2), t = Be(t, l, 2), t !== null && (bn(t, 2), se(t));
  }
  function Dt(t, l, e) {
    if (t.tag === 3)
      P0(t, t, e);
    else
      for (; l !== null; ) {
        if (l.tag === 3) {
          P0(
            l,
            t,
            e
          );
          break;
        } else if (l.tag === 1) {
          var a = l.stateNode;
          if (typeof l.type.getDerivedStateFromError == "function" || typeof a.componentDidCatch == "function" && (Le === null || !Le.has(a))) {
            t = wl(e, t), e = kr(2), a = Be(l, e, 2), a !== null && (Fr(
              e,
              a,
              l,
              t
            ), bn(a, 2), se(a));
            break;
          }
        }
        l = l.return;
      }
  }
  function Kf(t, l, e) {
    var a = t.pingCache;
    if (a === null) {
      a = t.pingCache = new im();
      var n = /* @__PURE__ */ new Set();
      a.set(l, n);
    } else
      n = a.get(l), n === void 0 && (n = /* @__PURE__ */ new Set(), a.set(l, n));
    n.has(e) || (qf = !0, n.add(e), t = vm.bind(null, t, l, e), l.then(t, t));
  }
  function vm(t, l, e) {
    var a = t.pingCache;
    a !== null && a.delete(l), t.pingedLanes |= t.suspendedLanes & e, t.warmLanes &= ~e, qt === t && (ot & e) === e && ((Lt === 4 || Lt === 3 && (ot & 62914560) === ot && 300 > Nl() - pi) && (_t & 2) === 0 ? en(t, 0) : Si |= e, Wa === ot && (Wa = 0)), se(t);
  }
  function td(t, l) {
    l === 0 && (l = Ys()), t = ua(t, l), t !== null && (bn(t, l), se(t));
  }
  function mm(t) {
    var l = t.memoizedState, e = 0;
    l !== null && (e = l.retryLane), td(t, e);
  }
  function gm(t, l) {
    var e = 0;
    switch (t.tag) {
      case 31:
      case 13:
        var a = t.stateNode, n = t.memoizedState;
        n !== null && (e = n.retryLane);
        break;
      case 19:
        a = t.stateNode;
        break;
      case 22:
        a = t.stateNode._retryCache;
        break;
      default:
        throw Error(s(314));
    }
    a !== null && a.delete(l), td(t, e);
  }
  function ym(t, l) {
    return $i(t, l);
  }
  var nn = null, un = null, Jf = !1, Mi = !1, $f = !1, Je = 0;
  function se(t) {
    t !== un && t.next === null && (un === null ? nn = un = t : un = un.next = t), Mi = !0, Jf || (Jf = !0, Sm());
  }
  function In(t, l) {
    if (!$f && Mi) {
      $f = !0;
      do
        for (var e = !1, a = nn; a !== null; ) {
          if (t !== 0) {
            var n = a.pendingLanes;
            if (n === 0) var u = 0;
            else {
              var i = a.suspendedLanes, c = a.pingedLanes;
              u = (1 << 31 - Al(42 | t) + 1) - 1, u &= n & ~(i & ~c), u = u & 201326741 ? u & 201326741 | 1 : u ? u | 2 : 0;
            }
            u !== 0 && (e = !0, nd(a, u));
          } else
            u = ot, u = Su(
              a,
              a === qt ? u : 0,
              a.cancelPendingCommit !== null || a.timeoutHandle !== -1
            ), (u & 3) === 0 || yn(a, u) || (e = !0, nd(a, u));
          a = a.next;
        }
      while (e);
      $f = !1;
    }
  }
  function bm() {
    ld();
  }
  function ld() {
    Mi = Jf = !1;
    var t = 0;
    Je !== 0 && Dm() && (t = Je);
    for (var l = Nl(), e = null, a = nn; a !== null; ) {
      var n = a.next, u = ed(a, l);
      u === 0 ? (a.next = null, e === null ? nn = n : e.next = n, n === null && (un = e)) : (e = a, (t !== 0 || (u & 3) !== 0) && (Mi = !0)), a = n;
    }
    Xt !== 0 && Xt !== 5 || In(t), Je !== 0 && (Je = 0);
  }
  function ed(t, l) {
    for (var e = t.suspendedLanes, a = t.pingedLanes, n = t.expirationTimes, u = t.pendingLanes & -62914561; 0 < u; ) {
      var i = 31 - Al(u), c = 1 << i, f = n[i];
      f === -1 ? ((c & e) === 0 || (c & a) !== 0) && (n[i] = qh(c, l)) : f <= l && (t.expiredLanes |= c), u &= ~c;
    }
    if (l = qt, e = ot, e = Su(
      t,
      t === l ? e : 0,
      t.cancelPendingCommit !== null || t.timeoutHandle !== -1
    ), a = t.callbackNode, e === 0 || t === l && (xt === 2 || xt === 9) || t.cancelPendingCommit !== null)
      return a !== null && a !== null && ki(a), t.callbackNode = null, t.callbackPriority = 0;
    if ((e & 3) === 0 || yn(t, e)) {
      if (l = e & -e, l === t.callbackPriority) return l;
      switch (a !== null && ki(a), Ii(e)) {
        case 2:
        case 8:
          e = js;
          break;
        case 32:
          e = mu;
          break;
        case 268435456:
          e = qs;
          break;
        default:
          e = mu;
      }
      return a = ad.bind(null, t), e = $i(e, a), t.callbackPriority = l, t.callbackNode = e, l;
    }
    return a !== null && a !== null && ki(a), t.callbackPriority = 2, t.callbackNode = null, 2;
  }
  function ad(t, l) {
    if (Xt !== 0 && Xt !== 5)
      return t.callbackNode = null, t.callbackPriority = 0, null;
    var e = t.callbackNode;
    if (Ai() && t.callbackNode !== e)
      return null;
    var a = ot;
    return a = Su(
      t,
      t === qt ? a : 0,
      t.cancelPendingCommit !== null || t.timeoutHandle !== -1
    ), a === 0 ? null : (Q0(t, a, l), ed(t, Nl()), t.callbackNode != null && t.callbackNode === e ? ad.bind(null, t) : null);
  }
  function nd(t, l) {
    if (Ai()) return null;
    Q0(t, l, !0);
  }
  function Sm() {
    Um(function() {
      (_t & 6) !== 0 ? $i(
        Hs,
        bm
      ) : ld();
    });
  }
  function kf() {
    if (Je === 0) {
      var t = ra;
      t === 0 && (t = gu, gu <<= 1, (gu & 261888) === 0 && (gu = 256)), Je = t;
    }
    return Je;
  }
  function ud(t) {
    return t == null || typeof t == "symbol" || typeof t == "boolean" ? null : typeof t == "function" ? t : zu(t);
  }
  function pm(t, l, e, a, n) {
    if (l === "submit" && e && e.stateNode === n) {
      var u = ud(
        (n[Sl] || null).action
      ), i = a.submitter;
      i && (l = (l = i[Sl] || null) ? ud(l.formAction) : i.getAttribute("formAction"), l !== null && (u = l, i = null));
      var c = new Mu(
        "action",
        "action",
        null,
        a,
        n
      );
      t.push({
        event: c,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (a.defaultPrevented) {
                if (Je !== 0) {
                  var f = new FormData(n, i);
                  ef(
                    e,
                    {
                      pending: !0,
                      data: f,
                      method: n.method,
                      action: u
                    },
                    null,
                    f
                  );
                }
              } else
                typeof u == "function" && (c.preventDefault(), f = new FormData(n, i), ef(
                  e,
                  {
                    pending: !0,
                    data: f,
                    method: n.method,
                    action: u
                  },
                  u,
                  f
                ));
            },
            currentTarget: n
          }
        ]
      });
    }
  }
  for (var Ff = 0; Ff < pc.length; Ff++) {
    var Wf = pc[Ff], Tm = Wf.toLowerCase(), Em = Wf[0].toUpperCase() + Wf.slice(1);
    Kl(
      Tm,
      "on" + Em
    );
  }
  Kl(Ro, "onAnimationEnd"), Kl(Uo, "onAnimationIteration"), Kl(Co, "onAnimationStart"), Kl("dblclick", "onDoubleClick"), Kl("focusin", "onFocus"), Kl("focusout", "onBlur"), Kl(Rv, "onTransitionRun"), Kl(Uv, "onTransitionStart"), Kl(Cv, "onTransitionCancel"), Kl(Ho, "onTransitionEnd"), Aa("onMouseEnter", ["mouseout", "mouseover"]), Aa("onMouseLeave", ["mouseout", "mouseover"]), Aa("onPointerEnter", ["pointerout", "pointerover"]), Aa("onPointerLeave", ["pointerout", "pointerover"]), ea(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), ea(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), ea("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), ea(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), ea(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), ea(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var Pn = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), _m = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Pn)
  );
  function id(t, l) {
    l = (l & 4) !== 0;
    for (var e = 0; e < t.length; e++) {
      var a = t[e], n = a.event;
      a = a.listeners;
      t: {
        var u = void 0;
        if (l)
          for (var i = a.length - 1; 0 <= i; i--) {
            var c = a[i], f = c.instance, v = c.currentTarget;
            if (c = c.listener, f !== u && n.isPropagationStopped())
              break t;
            u = c, n.currentTarget = v;
            try {
              u(n);
            } catch (y) {
              Ru(y);
            }
            n.currentTarget = null, u = f;
          }
        else
          for (i = 0; i < a.length; i++) {
            if (c = a[i], f = c.instance, v = c.currentTarget, c = c.listener, f !== u && n.isPropagationStopped())
              break t;
            u = c, n.currentTarget = v;
            try {
              u(n);
            } catch (y) {
              Ru(y);
            }
            n.currentTarget = null, u = f;
          }
      }
    }
  }
  function ft(t, l) {
    var e = l[Vs];
    e === void 0 && (e = l[Vs] = /* @__PURE__ */ new Set());
    var a = t + "__bubble";
    e.has(a) || (cd(l, t, 2, !1), e.add(a));
  }
  function If(t, l, e) {
    var a = 0;
    l && (a |= 4), cd(
      e,
      t,
      a,
      l
    );
  }
  var xi = "_reactListening" + Math.random().toString(36).slice(2);
  function Pf(t) {
    if (!t[xi]) {
      t[xi] = !0, Js.forEach(function(e) {
        e !== "selectionchange" && (_m.has(e) || If(e, !1, t), If(e, !0, t));
      });
      var l = t.nodeType === 9 ? t : t.ownerDocument;
      l === null || l[xi] || (l[xi] = !0, If("selectionchange", !1, l));
    }
  }
  function cd(t, l, e, a) {
    switch (Fd(l)) {
      case 2:
        var n = m1;
        break;
      case 8:
        n = g1;
        break;
      default:
        n = Ss;
    }
    e = n.bind(
      null,
      l,
      e,
      t
    ), n = void 0, !ic || l !== "touchstart" && l !== "touchmove" && l !== "wheel" || (n = !0), a ? n !== void 0 ? t.addEventListener(l, e, {
      capture: !0,
      passive: n
    }) : t.addEventListener(l, e, !0) : n !== void 0 ? t.addEventListener(l, e, {
      passive: n
    }) : t.addEventListener(l, e, !1);
  }
  function ts(t, l, e, a, n) {
    var u = a;
    if ((l & 1) === 0 && (l & 2) === 0 && a !== null)
      t: for (; ; ) {
        if (a === null) return;
        var i = a.tag;
        if (i === 3 || i === 4) {
          var c = a.stateNode.containerInfo;
          if (c === n) break;
          if (i === 4)
            for (i = a.return; i !== null; ) {
              var f = i.tag;
              if ((f === 3 || f === 4) && i.stateNode.containerInfo === n)
                return;
              i = i.return;
            }
          for (; c !== null; ) {
            if (i = la(c), i === null) return;
            if (f = i.tag, f === 5 || f === 6 || f === 26 || f === 27) {
              a = u = i;
              continue t;
            }
            c = c.parentNode;
          }
        }
        a = a.return;
      }
    io(function() {
      var v = u, y = nc(e), _ = [];
      t: {
        var d = jo.get(t);
        if (d !== void 0) {
          var g = Mu, D = t;
          switch (t) {
            case "keypress":
              if (Ou(e) === 0) break t;
            case "keydown":
            case "keyup":
              g = cv;
              break;
            case "focusin":
              D = "focus", g = oc;
              break;
            case "focusout":
              D = "blur", g = oc;
              break;
            case "beforeblur":
            case "afterblur":
              g = oc;
              break;
            case "click":
              if (e.button === 2) break t;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              g = so;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              g = kh;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              g = dv;
              break;
            case Ro:
            case Uo:
            case Co:
              g = Ih;
              break;
            case Ho:
              g = vv;
              break;
            case "scroll":
            case "scrollend":
              g = Jh;
              break;
            case "wheel":
              g = gv;
              break;
            case "copy":
            case "cut":
            case "paste":
              g = tv;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              g = ro;
              break;
            case "submit":
              g = ov;
              break;
            case "toggle":
            case "beforetoggle":
              g = bv;
          }
          var B = (l & 4) !== 0, tt = !B && (t === "scroll" || t === "scrollend"), h = B ? d !== null ? d + "Capture" : null : d;
          B = [];
          for (var o = v, m; o !== null; ) {
            var E = o;
            if (m = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || m === null || h === null || (E = Tn(o, h), E != null && B.push(
              tu(o, E, m)
            )), tt) break;
            o = o.return;
          }
          0 < B.length && (d = new g(
            d,
            D,
            null,
            e,
            y
          ), _.push({ event: d, listeners: B }));
        }
      }
      if ((l & 7) === 0) {
        t: {
          if (g = t === "mouseover" || t === "pointerover", d = t === "mouseout" || t === "pointerout", g && e !== ac && (D = e.relatedTarget || e.fromElement) && (la(D) || D[za]))
            break t;
          (d || g) && (D = y.window === y ? y : (g = y.ownerDocument) ? g.defaultView || g.parentWindow : window, d ? (g = e.relatedTarget || e.toElement, d = v, g = g ? la(g) : null, g !== null && (tt = k(g), B = g.tag, g !== tt || B !== 5 && B !== 27 && B !== 6) && (g = null)) : (d = null, g = v), d !== g && (B = so, E = "onMouseLeave", h = "onMouseEnter", o = "mouse", (t === "pointerout" || t === "pointerover") && (B = ro, E = "onPointerLeave", h = "onPointerEnter", o = "pointer"), tt = d == null ? D : pn(d), m = g == null ? D : pn(g), D = new B(
            E,
            o + "leave",
            d,
            e,
            y
          ), D.target = tt, D.relatedTarget = m, E = null, la(y) === v && (B = new B(
            h,
            o + "enter",
            g,
            e,
            y
          ), B.target = m, B.relatedTarget = tt, E = B), tt = E, B = d && g ? ut(
            d,
            g,
            zm
          ) : null, d !== null && fd(
            _,
            D,
            d,
            B,
            !1
          ), g !== null && tt !== null && fd(
            _,
            tt,
            g,
            B,
            !0
          )));
        }
        t: {
          if (d = v ? pn(v) : window, g = d.nodeName && d.nodeName.toLowerCase(), g === "select" || g === "input" && d.type === "file")
            var H = po;
          else if (bo(d))
            if (To)
              H = Mv;
            else {
              H = Ov;
              var rt = Nv;
            }
          else
            g = d.nodeName, !g || g.toLowerCase() !== "input" || d.type !== "checkbox" && d.type !== "radio" ? v && ec(v.elementType) && (H = po) : H = Av;
          if (H && (H = H(t, v))) {
            So(
              _,
              H,
              e,
              y
            );
            break t;
          }
          rt && rt(t, d, v);
        }
        switch (rt = v ? pn(v) : window, t) {
          case "focusin":
            (bo(rt) || rt.contentEditable === "true") && (Ca = rt, yc = v, xn = null);
            break;
          case "focusout":
            xn = yc = Ca = null;
            break;
          case "mousedown":
            bc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            bc = !1, xo(_, e, y);
            break;
          case "selectionchange":
            if (Dv) break;
          case "keydown":
          case "keyup":
            xo(_, e, y);
        }
        var Z;
        if (dc)
          t: {
            switch (t) {
              case "compositionstart":
                var L = "onCompositionStart";
                break t;
              case "compositionend":
                L = "onCompositionEnd";
                break t;
              case "compositionupdate":
                L = "onCompositionUpdate";
                break t;
            }
            L = void 0;
          }
        else
          Ua ? go(t, e) && (L = "onCompositionEnd") : t === "keydown" && e.keyCode === 229 && (L = "onCompositionStart");
        L && (ho && e.locale !== "ko" && (Ua || L !== "onCompositionStart" ? L === "onCompositionEnd" && Ua && (Z = co()) : (Me = y, cc = "value" in Me ? Me.value : Me.textContent, Ua = !0)), rt = Di(v, L), 0 < rt.length && (L = new oo(
          L,
          t,
          null,
          e,
          y
        ), _.push({ event: L, listeners: rt }), Z ? L.data = Z : (Z = yo(e), Z !== null && (L.data = Z)))), (Z = pv ? Tv(t, e) : Ev(t, e)) && (L = Di(v, "onBeforeInput"), 0 < L.length && (rt = new oo(
          "onBeforeInput",
          "beforeinput",
          null,
          e,
          y
        ), _.push({
          event: rt,
          listeners: L
        }), rt.data = Z)), pm(
          _,
          t,
          v,
          e,
          y
        );
      }
      id(_, l);
    });
  }
  function tu(t, l, e) {
    return {
      instance: t,
      listener: l,
      currentTarget: e
    };
  }
  function Di(t, l) {
    for (var e = l + "Capture", a = []; t !== null; ) {
      var n = t, u = n.stateNode;
      if (n = n.tag, n !== 5 && n !== 26 && n !== 27 || u === null || (n = Tn(t, e), n != null && a.unshift(
        tu(t, n, u)
      ), n = Tn(t, l), n != null && a.push(
        tu(t, n, u)
      )), t.tag === 3) return a;
      t = t.return;
    }
    return [];
  }
  function zm(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5 && t.tag !== 27);
    return t || null;
  }
  function fd(t, l, e, a, n) {
    for (var u = l._reactName, i = []; e !== null && e !== a; ) {
      var c = e, f = c.alternate, v = c.stateNode;
      if (c = c.tag, f !== null && f === a) break;
      c !== 5 && c !== 26 && c !== 27 || v === null || (f = v, n ? (v = Tn(e, u), v != null && i.unshift(
        tu(e, v, f)
      )) : n || (v = Tn(e, u), v != null && i.push(
        tu(e, v, f)
      ))), e = e.return;
    }
    i.length !== 0 && t.push({ event: l, listeners: i });
  }
  var Nm = /\r\n?/g, Om = /\u0000|\uFFFD/g;
  function sd(t) {
    return (typeof t == "string" ? t : "" + t).replace(Nm, `
`).replace(Om, "");
  }
  function od(t, l) {
    return l = sd(l), sd(t) === l;
  }
  function Rt(t, l, e, a, n, u) {
    switch (e) {
      case "children":
        if (typeof a == "string")
          l === "body" || l === "textarea" && a === "" || xa(t, a);
        else if (typeof a == "number" || typeof a == "bigint")
          l !== "body" && xa(t, "" + a);
        else return;
        break;
      case "className":
        _u(t, "class", a);
        break;
      case "tabIndex":
        _u(t, "tabindex", a);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        _u(t, e, a);
        break;
      case "style":
        no(t, a, u);
        return;
      case "data":
        if (l !== "object") {
          _u(t, "data", a);
          break;
        }
      case "src":
      case "href":
        if (a === "" && (l !== "a" || e !== "href")) {
          t.removeAttribute(e);
          break;
        }
        if (a == null || typeof a == "function" || typeof a == "symbol" || typeof a == "boolean") {
          t.removeAttribute(e);
          break;
        }
        a = zu(a), t.setAttribute(e, a);
        break;
      case "action":
      case "formAction":
        if (typeof a == "function") {
          t.setAttribute(
            e,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof u == "function" && (e === "formAction" ? (l !== "input" && Rt(t, l, "name", n.name, n, null), Rt(
            t,
            l,
            "formEncType",
            n.formEncType,
            n,
            null
          ), Rt(
            t,
            l,
            "formMethod",
            n.formMethod,
            n,
            null
          ), Rt(
            t,
            l,
            "formTarget",
            n.formTarget,
            n,
            null
          )) : (Rt(t, l, "encType", n.encType, n, null), Rt(t, l, "method", n.method, n, null), Rt(t, l, "target", n.target, n, null)));
        if (a == null || typeof a == "symbol" || typeof a == "boolean") {
          t.removeAttribute(e);
          break;
        }
        a = zu(a), t.setAttribute(e, a);
        break;
      case "onClick":
        a != null && (t.onclick = Pl);
        return;
      case "onScroll":
        a != null && ft("scroll", t);
        return;
      case "onScrollEnd":
        a != null && ft("scrollend", t);
        return;
      case "dangerouslySetInnerHTML":
        if (a != null) {
          if (typeof a != "object" || !("__html" in a))
            throw Error(s(61));
          if (e = a.__html, e != null) {
            if (n.children != null) throw Error(s(60));
            (u != null ? u.__html : void 0) !== e && (t.innerHTML = e);
          }
        }
        break;
      case "multiple":
        t.multiple = a && typeof a != "function" && typeof a != "symbol";
        break;
      case "muted":
        t.muted = a && typeof a != "function" && typeof a != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (a == null || typeof a == "function" || typeof a == "boolean" || typeof a == "symbol") {
          t.removeAttribute("xlink:href");
          break;
        }
        e = zu(a), t.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          e
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        a != null && typeof a != "function" && typeof a != "symbol" ? t.setAttribute(e, a) : t.removeAttribute(e);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "credentialless":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        a && typeof a != "function" && typeof a != "symbol" ? t.setAttribute(e, "") : t.removeAttribute(e);
        break;
      case "capture":
      case "download":
        a === !0 ? t.setAttribute(e, "") : a !== !1 && a != null && typeof a != "function" && typeof a != "symbol" ? t.setAttribute(e, a) : t.removeAttribute(e);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        a != null && typeof a != "function" && typeof a != "symbol" && !isNaN(a) && 1 <= a ? t.setAttribute(e, a) : t.removeAttribute(e);
        break;
      case "rowSpan":
      case "start":
        a == null || typeof a == "function" || typeof a == "symbol" || isNaN(a) ? t.removeAttribute(e) : t.setAttribute(e, a);
        break;
      case "popover":
        ft("beforetoggle", t), ft("toggle", t), Eu(t, "popover", a);
        break;
      case "xlinkActuate":
        re(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          a
        );
        break;
      case "xlinkArcrole":
        re(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          a
        );
        break;
      case "xlinkRole":
        re(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          a
        );
        break;
      case "xlinkShow":
        re(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          a
        );
        break;
      case "xlinkTitle":
        re(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          a
        );
        break;
      case "xlinkType":
        re(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          a
        );
        break;
      case "xmlBase":
        re(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          a
        );
        break;
      case "xmlLang":
        re(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          a
        );
        break;
      case "xmlSpace":
        re(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          a
        );
        break;
      case "is":
        Eu(t, "is", a);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < e.length) || e[0] !== "o" && e[0] !== "O" || e[1] !== "n" && e[1] !== "N")
          e = Lh.get(e) || e, Eu(t, e, a);
        else return;
    }
    St = !0;
  }
  function ls(t, l, e, a, n, u) {
    switch (e) {
      case "style":
        no(t, a, u);
        return;
      case "dangerouslySetInnerHTML":
        if (a != null) {
          if (typeof a != "object" || !("__html" in a))
            throw Error(s(61));
          if (e = a.__html, e != null) {
            if (n.children != null) throw Error(s(60));
            (u != null ? u.__html : void 0) !== e && (t.innerHTML = e);
          }
        }
        break;
      case "children":
        if (typeof a == "string") xa(t, a);
        else if (typeof a == "number" || typeof a == "bigint")
          xa(t, "" + a);
        else return;
        break;
      case "onScroll":
        a != null && ft("scroll", t);
        return;
      case "onScrollEnd":
        a != null && ft("scrollend", t);
        return;
      case "onClick":
        a != null && (t.onclick = Pl);
        return;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        return;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!$s.hasOwnProperty(e))
          t: {
            if (e[0] === "o" && e[1] === "n" && (n = e.endsWith("Capture"), u = e.slice(2, n ? e.length - 7 : void 0), l = t[Sl] || null, l = l != null ? l[e] : null, typeof l == "function" && t.removeEventListener(u, l, n), typeof a == "function")) {
              typeof l != "function" && l !== null && (e in t ? t[e] = null : t.hasAttribute(e) && t.removeAttribute(e)), t.addEventListener(u, a, n);
              break t;
            }
            St = !0, e in t ? t[e] = a : a === !0 ? t.setAttribute(e, "") : Eu(t, e, a);
          }
        return;
    }
    St = !0;
  }
  function rl(t, l, e) {
    switch (l) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        ft("error", t), ft("load", t);
        var a = !1, n = !1, u;
        for (u in e)
          if (e.hasOwnProperty(u)) {
            var i = e[u];
            if (i != null)
              switch (u) {
                case "src":
                  a = !0;
                  break;
                case "srcSet":
                  n = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(s(137, l));
                default:
                  Rt(t, l, u, i, e, null);
              }
          }
        n && Rt(t, l, "srcSet", e.srcSet, e, null), a && Rt(t, l, "src", e.src, e, null);
        return;
      case "input":
        ft("invalid", t);
        var c = u = i = n = null, f = null, v = null;
        for (a in e)
          if (e.hasOwnProperty(a)) {
            var y = e[a];
            if (y != null)
              switch (a) {
                case "name":
                  n = y;
                  break;
                case "type":
                  i = y;
                  break;
                case "checked":
                  f = y;
                  break;
                case "defaultChecked":
                  v = y;
                  break;
                case "value":
                  u = y;
                  break;
                case "defaultValue":
                  c = y;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (y != null)
                    throw Error(s(137, l));
                  break;
                default:
                  Rt(t, l, a, y, e, null);
              }
          }
        to(
          t,
          u,
          c,
          f,
          v,
          i,
          n,
          !1
        );
        return;
      case "select":
        ft("invalid", t), a = i = u = null;
        for (n in e)
          if (e.hasOwnProperty(n) && (c = e[n], c != null))
            switch (n) {
              case "value":
                u = c;
                break;
              case "defaultValue":
                i = c;
                break;
              case "multiple":
                a = c;
              default:
                Rt(t, l, n, c, e, null);
            }
        l = u, e = i, t.multiple = !!a, l != null ? Ma(t, !!a, l, !1) : e != null && Ma(t, !!a, e, !0);
        return;
      case "textarea":
        ft("invalid", t), u = n = a = null;
        for (i in e)
          if (e.hasOwnProperty(i) && (c = e[i], c != null))
            switch (i) {
              case "value":
                a = c;
                break;
              case "defaultValue":
                n = c;
                break;
              case "children":
                u = c;
                break;
              case "dangerouslySetInnerHTML":
                if (c != null) throw Error(s(91));
                break;
              default:
                Rt(t, l, i, c, e, null);
            }
        eo(t, a, n, u);
        return;
      case "option":
        for (f in e)
          if (e.hasOwnProperty(f) && (a = e[f], a != null))
            switch (f) {
              case "selected":
                t.selected = a && typeof a != "function" && typeof a != "symbol";
                break;
              default:
                Rt(t, l, f, a, e, null);
            }
        return;
      case "dialog":
        ft("beforetoggle", t), ft("toggle", t), ft("cancel", t), ft("close", t);
        break;
      case "iframe":
      case "object":
        ft("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < Pn.length; a++)
          ft(Pn[a], t);
        break;
      case "image":
        ft("error", t), ft("load", t);
        break;
      case "details":
        ft("toggle", t);
        break;
      case "embed":
      case "source":
      case "link":
        ft("error", t), ft("load", t);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (v in e)
          if (e.hasOwnProperty(v) && (a = e[v], a != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(s(137, l));
              default:
                Rt(t, l, v, a, e, null);
            }
        return;
      default:
        if (ec(l)) {
          for (y in e)
            e.hasOwnProperty(y) && (a = e[y], a !== void 0 && ls(
              t,
              l,
              y,
              a,
              e,
              void 0
            ));
          return;
        }
    }
    for (c in e)
      e.hasOwnProperty(c) && (a = e[c], a != null && Rt(t, l, c, a, e, null));
  }
  var Am = {};
  function Mm(t, l, e, a) {
    switch (l) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var n = null, u = null, i = null, c = null, f = null, v = null, y = null;
        for (g in e) {
          var _ = e[g];
          if (e.hasOwnProperty(g) && _ != null)
            switch (g) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                f = _;
              default:
                a.hasOwnProperty(g) || Rt(t, l, g, null, a, _);
            }
        }
        for (var d in a) {
          var g = a[d];
          if (_ = e[d], a.hasOwnProperty(d) && (g != null || _ != null))
            switch (d) {
              case "type":
                g !== _ && (St = !0), u = g;
                break;
              case "name":
                g !== _ && (St = !0), n = g;
                break;
              case "checked":
                g !== _ && (St = !0), v = g;
                break;
              case "defaultChecked":
                g !== _ && (St = !0), y = g;
                break;
              case "value":
                g !== _ && (St = !0), i = g;
                break;
              case "defaultValue":
                g !== _ && (St = !0), c = g;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (g != null)
                  throw Error(s(137, l));
                break;
              default:
                g !== _ && Rt(
                  t,
                  l,
                  d,
                  g,
                  a,
                  _
                );
            }
        }
        tc(
          t,
          i,
          c,
          f,
          v,
          y,
          u,
          n
        );
        return;
      case "select":
        g = i = c = d = null;
        for (u in e)
          if (f = e[u], e.hasOwnProperty(u) && f != null)
            switch (u) {
              case "value":
                break;
              case "multiple":
                g = f;
              default:
                a.hasOwnProperty(u) || Rt(
                  t,
                  l,
                  u,
                  null,
                  a,
                  f
                );
            }
        for (n in a)
          if (u = a[n], f = e[n], a.hasOwnProperty(n) && (u != null || f != null))
            switch (n) {
              case "value":
                u !== f && (St = !0), d = u;
                break;
              case "defaultValue":
                u !== f && (St = !0), c = u;
                break;
              case "multiple":
                u !== f && (St = !0), i = u;
              default:
                u !== f && Rt(
                  t,
                  l,
                  n,
                  u,
                  a,
                  f
                );
            }
        l = c, e = i, a = g, d != null ? Ma(t, !!e, d, !1) : !!a != !!e && (l != null ? Ma(t, !!e, l, !0) : Ma(t, !!e, e ? [] : "", !1));
        return;
      case "textarea":
        g = d = null;
        for (c in e)
          if (n = e[c], e.hasOwnProperty(c) && n != null && !a.hasOwnProperty(c))
            switch (c) {
              case "value":
                break;
              case "children":
                break;
              default:
                Rt(t, l, c, null, a, n);
            }
        for (i in a)
          if (n = a[i], u = e[i], a.hasOwnProperty(i) && (n != null || u != null))
            switch (i) {
              case "value":
                n !== u && (St = !0), d = n;
                break;
              case "defaultValue":
                n !== u && (St = !0), g = n;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (n != null) throw Error(s(91));
                break;
              default:
                n !== u && Rt(t, l, i, n, a, u);
            }
        lo(t, d, g);
        return;
      case "option":
        for (var D in e)
          if (d = e[D], e.hasOwnProperty(D) && d != null && !a.hasOwnProperty(D))
            switch (D) {
              case "selected":
                t.selected = !1;
                break;
              default:
                Rt(
                  t,
                  l,
                  D,
                  null,
                  a,
                  d
                );
            }
        for (f in a)
          if (d = a[f], g = e[f], a.hasOwnProperty(f) && d !== g && (d != null || g != null))
            switch (f) {
              case "selected":
                d !== g && (St = !0), t.selected = d && typeof d != "function" && typeof d != "symbol";
                break;
              default:
                Rt(
                  t,
                  l,
                  f,
                  d,
                  a,
                  g
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var B in e)
          d = e[B], e.hasOwnProperty(B) && d != null && !a.hasOwnProperty(B) && Rt(t, l, B, null, a, d);
        for (v in a)
          if (d = a[v], g = e[v], a.hasOwnProperty(v) && d !== g && (d != null || g != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (d != null)
                  throw Error(s(137, l));
                break;
              default:
                Rt(
                  t,
                  l,
                  v,
                  d,
                  a,
                  g
                );
            }
        return;
      default:
        if (ec(l)) {
          for (var tt in e)
            d = e[tt], e.hasOwnProperty(tt) && d !== void 0 && !a.hasOwnProperty(tt) && ls(
              t,
              l,
              tt,
              void 0,
              a,
              d
            );
          for (y in a)
            d = a[y], g = e[y], !a.hasOwnProperty(y) || d === g || d === void 0 && g === void 0 || ls(
              t,
              l,
              y,
              d,
              a,
              g
            );
          return;
        }
    }
    for (var h in e)
      d = e[h], e.hasOwnProperty(h) && d != null && !a.hasOwnProperty(h) && Rt(t, l, h, null, a, d);
    for (_ in a)
      d = a[_], g = e[_], !a.hasOwnProperty(_) || d === g || d == null && g == null || Rt(t, l, _, d, a, g);
  }
  function rd(t) {
    switch (t) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function xm() {
    if (typeof performance.getEntriesByType == "function") {
      for (var t = 0, l = 0, e = performance.getEntriesByType("resource"), a = 0; a < e.length; a++) {
        var n = e[a], u = n.transferSize, i = n.initiatorType, c = n.duration;
        if (u && c && rd(i)) {
          for (i = 0, c = n.responseEnd, a += 1; a < e.length; a++) {
            var f = e[a], v = f.startTime;
            if (v > c) break;
            var y = f.transferSize, _ = f.initiatorType;
            y && rd(_) && (f = f.responseEnd, i += y * (f < c ? 1 : (c - v) / (f - v)));
          }
          if (--a, l += 8 * (u + i) / (n.duration / 1e3), t++, 10 < t) break;
        }
      }
      if (0 < t) return l / t / 1e6;
    }
    return navigator.connection && (t = navigator.connection.downlink, typeof t == "number") ? t : 5;
  }
  var es = null, as = null;
  function lu(t) {
    return t.nodeType === 9 ? t : t.ownerDocument;
  }
  function dd(t) {
    switch (t) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function hd(t, l) {
    if (t === 0)
      switch (l) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return t === 1 && l === "foreignObject" ? 0 : t;
  }
  function vd(t, l, e, a) {
    return e = lu(
      e
    ).createElement(t), e[il] = a, e[Sl] = l, rl(e, t, l), tl(e), e;
  }
  function ns(t, l) {
    return t === "textarea" || t === "noscript" || typeof l.children == "string" || typeof l.children == "number" || typeof l.children == "bigint" || typeof l.dangerouslySetInnerHTML == "object" && l.dangerouslySetInnerHTML !== null && l.dangerouslySetInnerHTML.__html != null;
  }
  var us = null;
  function Dm() {
    var t = window.event;
    return t && t.type === "popstate" ? t === us ? !1 : (us = t, !0) : (us = null, !1);
  }
  var is = typeof setTimeout == "function" ? setTimeout : void 0, Rm = typeof clearTimeout == "function" ? clearTimeout : void 0, md = typeof Promise == "function" ? Promise : void 0, gd = typeof requestAnimationFrame == "function" ? requestAnimationFrame : is, Um = typeof queueMicrotask == "function" ? queueMicrotask : typeof md < "u" ? function(t) {
    return md.resolve(null).then(t).catch(Cm);
  } : is;
  function Cm(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function $e(t) {
    return t === "head";
  }
  function yd(t, l) {
    var e = l, a = 0;
    do {
      var n = e.nextSibling;
      if (t.removeChild(e), n && n.nodeType === 8)
        if (e = n.data, e === "/$" || e === "/&") {
          if (a === 0) {
            t.removeChild(n), hn(l);
            return;
          }
          a--;
        } else if (e === "$" || e === "$?" || e === "$~" || e === "$!" || e === "&")
          a++;
        else if (e === "html")
          vs(
            t.ownerDocument.documentElement
          );
        else if (e === "head") {
          e = t.ownerDocument.head, vs(e);
          for (var u = e.firstChild; u; ) {
            var i = u.nextSibling, c = u.nodeName;
            u[Sn] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && u.rel.toLowerCase() === "stylesheet" || e.removeChild(u), u = i;
          }
        } else
          e === "body" && vs(t.ownerDocument.body);
      e = n;
    } while (e);
    hn(l);
  }
  function bd(t, l) {
    var e = t;
    t = 0;
    do {
      var a = e.nextSibling;
      if (e.nodeType === 1 ? l ? (e._stashedDisplay = e.style.display, e.style.display = "none") : (e.style.display = e._stashedDisplay || "", e.getAttribute("style") === "" && e.removeAttribute("style")) : e.nodeType === 3 && (l ? (e._stashedText = e.nodeValue, e.nodeValue = "") : e.nodeValue = e._stashedText || ""), a && a.nodeType === 8)
        if (e = a.data, e === "/$") {
          if (t === 0) break;
          t--;
        } else
          e !== "$" && e !== "$?" && e !== "$~" && e !== "$!" || t++;
      e = a;
    } while (e);
  }
  function Sd(t, l, e) {
    if (l = CSS.escape(l) !== l ? "r-" + btoa(l).replace(/=/g, "") : l, t.style.viewTransitionName = l, e != null && (t.style.viewTransitionClass = e), e = getComputedStyle(t), e.display === "inline") {
      if (l = t.getClientRects(), l.length === 1) var a = 1;
      else
        for (var n = a = 0; n < l.length; n++) {
          var u = l[n];
          0 < u.width && 0 < u.height && a++;
        }
      a === 1 && (t = t.style, t.display = l.length === 1 ? "inline-block" : "block", t.marginTop = "-" + e.paddingTop, t.marginBottom = "-" + e.paddingBottom);
    }
  }
  function pd(t, l) {
    t = t.style, l = l.style;
    var e = l != null ? l.hasOwnProperty("viewTransitionName") ? l.viewTransitionName : l.hasOwnProperty("view-transition-name") ? l["view-transition-name"] : null : null;
    t.viewTransitionName = e == null || typeof e == "boolean" ? "" : ("" + e).trim(), e = l != null ? l.hasOwnProperty("viewTransitionClass") ? l.viewTransitionClass : l.hasOwnProperty("view-transition-class") ? l["view-transition-class"] : null : null, t.viewTransitionClass = e == null || typeof e == "boolean" ? "" : ("" + e).trim(), t.display === "inline-block" && (l == null ? t.display = t.margin = "" : (e = l.display, t.display = e == null || typeof e == "boolean" ? "" : e, e = l.margin, e != null ? t.margin = e : (e = l.hasOwnProperty("marginTop") ? l.marginTop : l["margin-top"], t.marginTop = e == null || typeof e == "boolean" ? "" : e, l = l.hasOwnProperty("marginBottom") ? l.marginBottom : l["margin-bottom"], t.marginBottom = l == null || typeof l == "boolean" ? "" : l)));
  }
  function Hm(t, l, e) {
    return e = e.ownerDocument.defaultView, {
      rect: t,
      abs: l.position === "absolute" || l.position === "fixed",
      clip: l.clipPath !== "none" || l.overflow !== "visible" || l.filter !== "none" || l.mask !== "none" || l.mask !== "none" || l.borderRadius !== "0px",
      view: 0 <= t.bottom && 0 <= t.right && t.top <= e.innerHeight && t.left <= e.innerWidth
    };
  }
  function cs(t) {
    var l = t.getBoundingClientRect(), e = getComputedStyle(t);
    return Hm(l, e, t);
  }
  function jm(t) {
    return t.documentElement.clientHeight;
  }
  function qm(t) {
    this.addEventListener("load", t), this.addEventListener("error", t);
  }
  function Bm(t, l, e, a, n, u, i, c, f) {
    var v = l.nodeType === 9 ? l : l.ownerDocument;
    try {
      var y = v.startViewTransition({
        update: function() {
          var d = v.defaultView, g = d.navigation && d.navigation.transition, D = v.fonts.status;
          a();
          var B = [];
          if (D === "loaded" && (jm(v), v.fonts.status === "loading" && B.push(v.fonts.ready)), D = B.length, t !== null)
            for (var tt = t.suspenseyImages, h = 0, o = 0; o < tt.length; o++) {
              var m = tt[o];
              if (!m.complete) {
                var E = m.getBoundingClientRect();
                if (0 < E.bottom && 0 < E.right && E.top < d.innerHeight && E.left < d.innerWidth) {
                  if (h += Xd(m), h > Ci) {
                    B.length = D;
                    break;
                  }
                  m = new Promise(
                    qm.bind(m)
                  ), B.push(m);
                }
              }
            }
          if (0 < B.length)
            return d = Promise.race([
              Promise.all(B),
              new Promise(function(H) {
                return setTimeout(H, 500);
              })
            ]).then(n, n), (g ? Promise.allSettled([g.finished, d]) : d).then(u, u);
          if (n(), g)
            return g.finished.then(
              u,
              u
            );
          u();
        },
        types: e
      });
      v.__reactViewTransition = y;
      var _ = [];
      return y.ready.then(
        function() {
          for (var d = v.documentElement.getAnimations({
            subtree: !0
          }), g = 0; g < d.length; g++) {
            var D = d[g], B = D.effect, tt = B.pseudoElement;
            if (tt != null && tt.startsWith("::view-transition")) {
              _.push(D), D = B.getKeyframes();
              for (var h = tt = void 0, o = !0, m = 0; m < D.length; m++) {
                var E = D[m], H = E.width;
                if (tt === void 0) tt = H;
                else if (tt !== H) {
                  o = !1;
                  break;
                }
                if (H = E.height, h === void 0) h = H;
                else if (h !== H) {
                  o = !1;
                  break;
                }
                delete E.width, delete E.height, E.transform === "none" && delete E.transform;
              }
              o && tt !== void 0 && h !== void 0 && (B.setKeyframes(D), o = getComputedStyle(
                B.target,
                B.pseudoElement
              ), o.width !== tt || o.height !== h) && (o = D[0], o.width = tt, o.height = h, o = D[D.length - 1], o.width = tt, o.height = h, B.setKeyframes(D));
            }
          }
          i();
        },
        function(d) {
          v.__reactViewTransition === y && (v.__reactViewTransition = null);
          try {
            if (typeof d == "object" && d !== null)
              switch (d.name) {
                case "InvalidStateError":
                  (d.message === "View transition was skipped because document visibility state is hidden." || d.message === "Skipping view transition because document visibility state has become hidden." || d.message === "Skipping view transition because viewport size changed." || d.message === "Transition was aborted because of invalid state") && (d = null);
              }
            d !== null && f(d);
          } finally {
            a(), n(), i();
          }
        }
      ), y.finished.finally(function() {
        for (var d = 0; d < _.length; d++)
          _[d].cancel();
        v.__reactViewTransition === y && (v.__reactViewTransition = null), c();
      }), y;
    } catch {
      return a(), n(), i(), null;
    }
  }
  function Ea(t, l) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + t + "(" + l + ")";
  }
  Ea.prototype.animate = function(t, l) {
    return l = typeof l == "number" ? { duration: l } : G({}, l), l.pseudoElement = this._selector, this._scope.animate(t, l);
  }, Ea.prototype.getAnimations = function() {
    for (var t = this._scope, l = this._selector, e = t.getAnimations({ subtree: !0 }), a = [], n = 0; n < e.length; n++) {
      var u = e[n].effect;
      u !== null && u.target === t && u.pseudoElement === l && a.push(e[n]);
    }
    return a;
  }, Ea.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function Td(t) {
    return {
      name: t,
      group: new Ea("group", t),
      imagePair: new Ea("image-pair", t),
      old: new Ea("old", t),
      new: new Ea("new", t)
    };
  }
  function jl(t) {
    this._fragmentFiber = t, this._observers = this._eventListeners = null;
  }
  jl.prototype.addEventListener = function(t, l, e) {
    var a = null, n = null;
    if (!(e != null && typeof e != "boolean" && (a = e.signal || null, a !== null && a.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var u = this._eventListeners;
      if (_d(u, t, l, e) === -1) {
        var i = this, c = l;
        e != null && typeof e != "boolean" && e.once === !0 && (c = function(f) {
          i.removeEventListener(
            t,
            l,
            e
          ), typeof l == "function" ? l.call(this, f) : l.handleEvent(f);
        }), a !== null && (n = i.removeEventListener.bind(
          i,
          t,
          l,
          e
        ), a.addEventListener("abort", n, { once: !0 }), n = a.removeEventListener.bind(a, "abort", n)), a = cn(e), u.push({
          type: t,
          listener: l,
          optionsOrUseCapture: e,
          attachedListener: c,
          cleanup: n
        }), p(
          this._fragmentFiber.child,
          !1,
          Ym,
          t,
          c,
          a
        );
      }
      this._eventListeners = u;
    }
  };
  function Ym(t, l, e, a) {
    return F(t).addEventListener(
      l,
      e,
      a
    ), !1;
  }
  jl.prototype.removeEventListener = function(t, l, e) {
    var a = this._eventListeners;
    if (a !== null && (l = _d(
      a,
      t,
      l,
      e
    ), l !== -1)) {
      var n = a[l];
      e = n.attachedListener;
      var u = n.cleanup;
      n = cn(n.optionsOrUseCapture), p(
        this._fragmentFiber.child,
        !1,
        wm,
        t,
        e,
        n
      ), a.splice(l, 1), u !== null && u();
    }
  };
  function wm(t, l, e, a) {
    return F(t).removeEventListener(
      l,
      e,
      a
    ), !1;
  }
  function cn(t) {
    return t != null && typeof t != "boolean" && (t.once === !0 || t.signal instanceof AbortSignal) ? { capture: t.capture, passive: t.passive } : t;
  }
  function Ed(t) {
    return t == null ? "c=0" : typeof t == "boolean" ? "c=" + (t ? "1" : "0") : "c=" + (t.capture ? "1" : "0");
  }
  function _d(t, l, e, a) {
    if (t.length === 0) return -1;
    a = Ed(a);
    for (var n = 0; n < t.length; n++) {
      var u = t[n];
      if (u.type === l && u.listener === e && Ed(u.optionsOrUseCapture) === a)
        return n;
    }
    return -1;
  }
  jl.prototype.dispatchEvent = function(t) {
    var l = Y(
      this._fragmentFiber
    );
    if (l === null) return !0;
    l = F(l);
    var e = this._eventListeners;
    if (e !== null && 0 < e.length || !t.bubbles) {
      var a = l.nodeType === 9 ? l.createComment("") : document.createTextNode("");
      if (e)
        for (var n = 0; n < e.length; n++) {
          var u = e[n];
          a.addEventListener(
            u.type,
            u.attachedListener,
            cn(u.optionsOrUseCapture)
          );
        }
      if (l.appendChild(a), t = a.dispatchEvent(t), e)
        for (n = 0; n < e.length; n++)
          u = e[n], a.removeEventListener(
            u.type,
            u.attachedListener,
            cn(u.optionsOrUseCapture)
          );
      return l.removeChild(a), t;
    }
    return l.dispatchEvent(t);
  }, jl.prototype.focus = function(t) {
    p(
      this._fragmentFiber.child,
      !0,
      zd,
      t,
      void 0,
      void 0
    );
  };
  function zd(t, l) {
    return t.tag === 6 ? !1 : (t = F(t), Wm(t, l));
  }
  jl.prototype.focusLast = function(t) {
    var l = [];
    p(
      this._fragmentFiber.child,
      !0,
      fs,
      l,
      void 0,
      void 0
    );
    for (var e = l.length - 1; 0 <= e && !zd(l[e], t); e--) ;
  };
  function fs(t, l) {
    return l.push(t), !1;
  }
  jl.prototype.blur = function() {
    var t = Y(
      this._fragmentFiber
    );
    t !== null && (t = F(t), t = lu(t).activeElement, t !== null && p(
      this._fragmentFiber.child,
      !1,
      Gm,
      t,
      void 0,
      void 0
    ));
  };
  function Gm(t, l) {
    return t.tag === 6 ? !1 : (t = F(t), t === l || t.contains(l) ? (l.blur(), !0) : !1);
  }
  jl.prototype.observeUsing = function(t) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(t), p(
      this._fragmentFiber.child,
      !1,
      Xm,
      t,
      void 0,
      void 0
    );
  };
  function Xm(t, l) {
    return t.tag === 6 || (t = F(t), l.observe(t)), !1;
  }
  jl.prototype.unobserveUsing = function(t) {
    var l = this._observers;
    if (l !== null && l.has(t)) {
      l.delete(t), p(
        this._fragmentFiber.child,
        !1,
        Qm,
        t,
        void 0,
        void 0
      );
      for (var e = l = 0; e < Wl.length; e++) {
        var a = Wl[e];
        a.fragmentInstance === this && a.observer === t ? t.unobserve(a.instance) : Wl[l++] = a;
      }
      Wl.length = l;
    }
  };
  function Qm(t, l) {
    return t.tag === 6 || (t = F(t), l.unobserve(t)), !1;
  }
  var Wl = [], ss = !1;
  function Zm(t, l, e) {
    Wl.push({
      fragmentInstance: t,
      observer: l,
      instance: e
    }), ss || (ss = !0, Im(function() {
      ss = !1;
      var a = Wl;
      Wl = [];
      for (var n = 0; n < a.length; n++) {
        var u = a[n];
        u.observer.unobserve(u.instance);
      }
    }));
  }
  jl.prototype.getClientRects = function() {
    var t = [];
    return p(
      this._fragmentFiber.child,
      !1,
      Vm,
      t,
      void 0,
      void 0
    ), t;
  };
  function Vm(t, l) {
    if (t.tag === 6) {
      t = t.stateNode;
      var e = t.ownerDocument.createRange();
      e.selectNodeContents(t), l.push.apply(l, e.getClientRects());
    } else
      t = F(t), l.push.apply(l, t.getClientRects());
    return !1;
  }
  jl.prototype.getRootNode = function(t) {
    var l = Y(
      this._fragmentFiber
    );
    return l === null ? this : F(l).getRootNode(t);
  }, jl.prototype.compareDocumentPosition = function(t) {
    var l = Y(
      this._fragmentFiber
    );
    if (l === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var e = [];
    p(
      this._fragmentFiber.child,
      !1,
      fs,
      e,
      void 0,
      void 0
    );
    var a = F(l);
    if (e.length === 0) {
      if (e = a, Ut(this._fragmentFiber)) {
        t: {
          for (l = this._fragmentFiber.return; l !== null; ) {
            if (l.tag === 4) {
              l = l.stateNode.containerInfo;
              break t;
            }
            if (l.tag === 3 || l.tag === 5 || l.tag === 27)
              break;
            l = l.return;
          }
          l = null;
        }
        l != null && (e = l);
      }
      l = this._fragmentFiber;
      var n = a = e.compareDocumentPosition(t);
      return e === t ? n = Node.DOCUMENT_POSITION_CONTAINS : a & Node.DOCUMENT_POSITION_CONTAINED_BY && (e = jt(l)[1], e === null ? n = Node.DOCUMENT_POSITION_PRECEDING : (t = F(e).compareDocumentPosition(
        t
      ), n = t === 0 || t & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), n |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    l = F(e[0]), n = F(e[e.length - 1]);
    var u = Ut(this._fragmentFiber) ? l.parentElement : a;
    if (u == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    a = u.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_CONTAINED_BY, u = u.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = l.compareDocumentPosition(t), c = n.compareDocumentPosition(t), f = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = a && u && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, l = a && l === t || u && n === t || f || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !a && l === t || !u && n === t ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, l & Node.DOCUMENT_POSITION_DISCONNECTED || l & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Lm(
      l,
      this._fragmentFiber,
      e[0],
      e[e.length - 1],
      t
    ) ? l : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function Lm(t, l, e, a, n) {
    var u = la(n);
    if (t & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      if (e = !!u)
        t: {
          for (; u !== null; ) {
            if (u.tag === 7 && (u === l || u.alternate === l)) {
              e = !0;
              break t;
            }
            u = u.return;
          }
          e = !1;
        }
      return e;
    }
    if (t & Node.DOCUMENT_POSITION_CONTAINS) {
      if (u === null)
        return u = n.ownerDocument, n === u || n === u.documentElement || n === u.body;
      t: {
        for (u = l, l = Y(l); u !== null; ) {
          if (!(u.tag !== 5 && u.tag !== 3 && u.tag !== 27 || u !== l && u.alternate !== l)) {
            u = !0;
            break t;
          }
          u = u.return;
        }
        u = !1;
      }
      return u;
    }
    return t & Node.DOCUMENT_POSITION_PRECEDING ? ((l = !!u) && !(l = u === e) && (l = ut(
      e,
      u,
      I
    ), l === null ? l = !1 : (p(
      l,
      !0,
      ul,
      u,
      e
    ), u = Tt, Tt = null, l = u !== null)), l) : t & Node.DOCUMENT_POSITION_FOLLOWING ? ((l = !!u) && !(l = u === a) && (l = ut(
      a,
      u,
      I
    ), l === null ? l = !1 : (p(
      l,
      !0,
      bt,
      u,
      a
    ), u = Tt, At = Tt = null, l = u !== null)), l) : !1;
  }
  function Nd(t, l) {
    var e = t.ownerDocument.createRange();
    e.selectNodeContents(t), t = e.getBoundingClientRect(), window.scrollTo(
      window.scrollX + t.left,
      l ? window.scrollY + t.top : window.scrollY + t.bottom - window.innerHeight
    );
  }
  jl.prototype.scrollIntoView = function(t) {
    if (typeof t == "object") throw Error(s(566));
    var l = [];
    p(
      this._fragmentFiber.child,
      !1,
      fs,
      l,
      void 0,
      void 0
    );
    var e = t !== !1;
    if (l.length === 0) {
      var a = jt(
        this._fragmentFiber
      );
      if (a = e ? a[1] || a[0] || Y(this._fragmentFiber) : a[0] || a[1], a === null) return;
      if (a.tag === 6) {
        t = F(a), Nd(t, e);
        return;
      }
      if (a = F(a), a.nodeType !== 9) {
        if (a.nodeType === 11) {
          e = "host" in a ? a.host : null, e !== null && e.scrollIntoView(t);
          return;
        }
        a.scrollIntoView(t);
      }
    }
    for (a = e ? l.length - 1 : 0; a !== (e ? -1 : l.length); ) {
      var n = l[a];
      n.tag === 6 ? (n = F(n), Nd(n, e)) : F(n).scrollIntoView(t), a += e ? -1 : 1;
    }
  };
  function Km(t, l) {
    return t = F(t), Od(t, l), !1;
  }
  function Od(t, l) {
    t.reactFragments == null && (t.reactFragments = /* @__PURE__ */ new Set()), t.reactFragments.add(l);
  }
  function Ad(t, l) {
    var e = l._eventListeners;
    if (e !== null)
      for (var a = 0; a < e.length; a++) {
        var n = e[a];
        t.addEventListener(
          n.type,
          n.attachedListener,
          cn(n.optionsOrUseCapture)
        );
      }
    t.nodeType !== 3 && (e = l._observers, e !== null && e.forEach(function(u) {
      for (var i = 0, c = 0; c < Wl.length; c++) {
        var f = Wl[c];
        (f.fragmentInstance !== l || f.observer !== u || f.instance !== t) && (Wl[i++] = f);
      }
      Wl.length = i, u.observe(t);
    }), Od(t, l));
  }
  function Jm(t, l) {
    var e = l._eventListeners;
    if (e !== null)
      for (var a = 0; a < e.length; a++) {
        var n = e[a];
        t.removeEventListener(
          n.type,
          n.attachedListener,
          cn(n.optionsOrUseCapture)
        );
      }
    t.nodeType !== 3 && (e = l._observers, e !== null && e.forEach(function(u) {
      typeof u.rootMargin == "string" ? Zm(
        l,
        u,
        t
      ) : u.unobserve(t);
    }), t.reactFragments != null && t.reactFragments.delete(l));
  }
  function os(t) {
    var l = t.firstChild;
    for (l && l.nodeType === 10 && (l = l.nextSibling); l; ) {
      var e = l;
      switch (l = l.nextSibling, e.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          os(e), Tu(e);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (e.rel.toLowerCase() === "stylesheet") continue;
      }
      t.removeChild(e);
    }
  }
  function $m(t, l, e, a) {
    for (; t.nodeType === 1; ) {
      var n = e;
      if (t.nodeName.toLowerCase() !== l.toLowerCase()) {
        if (!a && (t.nodeName !== "INPUT" || t.type !== "hidden"))
          break;
      } else if (a) {
        if (!t[Sn])
          switch (l) {
            case "meta":
              if (!t.hasAttribute("itemprop")) break;
              return t;
            case "link":
              if (u = t.getAttribute("rel"), u === "stylesheet" && t.hasAttribute("data-precedence"))
                break;
              if (u !== n.rel || t.getAttribute("href") !== (n.href == null || n.href === "" ? null : n.href) || t.getAttribute("crossorigin") !== (n.crossOrigin == null ? null : n.crossOrigin) || t.getAttribute("title") !== (n.title == null ? null : n.title))
                break;
              return t;
            case "style":
              if (t.hasAttribute("data-precedence")) break;
              return t;
            case "script":
              if (u = t.getAttribute("src"), (u !== (n.src == null ? null : n.src) || t.getAttribute("type") !== (n.type == null ? null : n.type) || t.getAttribute("crossorigin") !== (n.crossOrigin == null ? null : n.crossOrigin)) && u && t.hasAttribute("async") && !t.hasAttribute("itemprop"))
                break;
              return t;
            default:
              return t;
          }
      } else if (l === "input" && t.type === "hidden") {
        var u = n.name == null ? null : "" + n.name;
        if (n.type === "hidden" && t.getAttribute("name") === u)
          return t;
      } else return t;
      if (t = Vl(t.nextSibling), t === null) break;
    }
    return null;
  }
  function km(t, l, e) {
    if (l === "") return null;
    for (; t.nodeType !== 3; )
      if ((t.nodeType !== 1 || t.nodeName !== "INPUT" || t.type !== "hidden") && !e || (t = Vl(t.nextSibling), t === null)) return null;
    return t;
  }
  function Md(t, l) {
    for (; t.nodeType !== 8; )
      if ((t.nodeType !== 1 || t.nodeName !== "INPUT" || t.type !== "hidden") && !l || (t = Vl(t.nextSibling), t === null)) return null;
    return t;
  }
  function rs(t) {
    return t.data === "$?" || t.data === "$~";
  }
  function ds(t) {
    return t.data === "$!" || t.data === "$?" && t.ownerDocument.readyState !== "loading";
  }
  function Fm(t, l) {
    var e = t.ownerDocument;
    if (t.data === "$~") t._reactRetry = l;
    else if (t.data !== "$?" || e.readyState !== "loading")
      l();
    else {
      var a = function() {
        l(), e.removeEventListener("DOMContentLoaded", a);
      };
      e.addEventListener("DOMContentLoaded", a), t._reactRetry = a;
    }
  }
  function Vl(t) {
    for (; t != null; t = t.nextSibling) {
      var l = t.nodeType;
      if (l === 1 || l === 3) break;
      if (l === 8) {
        if (l = t.data, l === "$" || l === "$!" || l === "$?" || l === "$~" || l === "&" || l === "F!" || l === "F")
          break;
        if (l === "/$" || l === "/&") return null;
      }
    }
    return t;
  }
  var hs = null;
  function xd(t) {
    t = t.nextSibling;
    for (var l = 0; t; ) {
      if (t.nodeType === 8) {
        var e = t.data;
        if (e === "/$" || e === "/&") {
          if (l === 0)
            return Vl(t.nextSibling);
          l--;
        } else
          e !== "$" && e !== "$!" && e !== "$?" && e !== "$~" && e !== "&" || l++;
      }
      t = t.nextSibling;
    }
    return null;
  }
  function Dd(t) {
    t = t.previousSibling;
    for (var l = 0; t; ) {
      if (t.nodeType === 8) {
        var e = t.data;
        if (e === "$" || e === "$!" || e === "$?" || e === "$~" || e === "&") {
          if (l === 0) return t;
          l--;
        } else e !== "/$" && e !== "/&" || l++;
      }
      t = t.previousSibling;
    }
    return null;
  }
  function Wm(t, l) {
    function e() {
      a = !0;
    }
    if (t.ownerDocument.activeElement === t) return !0;
    var a = !1;
    try {
      t.ownerDocument.addEventListener("focus", e, !0), (t.focus || HTMLElement.prototype.focus).call(t, l);
    } finally {
      t.ownerDocument.removeEventListener("focus", e, !0);
    }
    return a;
  }
  function Im(t) {
    gd(function() {
      gd(function(l) {
        return t(l);
      });
    });
  }
  function Rd(t, l, e) {
    switch (l = lu(e), t) {
      case "html":
        if (t = l.documentElement, !t) throw Error(s(452));
        return t;
      case "head":
        if (t = l.head, !t) throw Error(s(453));
        return t;
      case "body":
        if (t = l.body, !t) throw Error(s(454));
        return t;
      default:
        throw Error(s(451));
    }
  }
  function Ud(t, l, e) {
    for (var a in e) {
      var n = e[a];
      e.hasOwnProperty(a) && n != null && Rt(t, l, a, null, Am, n);
    }
    e.dangerouslySetInnerHTML != null && (t.textContent = ""), t.onclick === Pl && (t.onclick = null), Tu(t);
  }
  function vs(t) {
    for (var l = t.attributes; l.length; )
      t.removeAttributeNode(l[0]);
    Tu(t);
  }
  var Ll = /* @__PURE__ */ new Map(), Cd = /* @__PURE__ */ new Set();
  function eu(t) {
    if (typeof t.getRootNode == "function") {
      var l = t.getRootNode();
      if (l.nodeType === 9 || l.nodeType === 11) return l;
    }
    return t.nodeType === 9 ? t : t.ownerDocument;
  }
  var ze = z.d;
  z.d = {
    f: Pm,
    r: t1,
    D: l1,
    C: e1,
    L: a1,
    m: n1,
    X: i1,
    S: u1,
    M: c1
  };
  function Pm() {
    var t = ze.f(), l = zi();
    return t || l;
  }
  function t1(t) {
    var l = Na(t);
    l !== null && l.tag === 5 && l.type === "form" ? jr(l) : ze.r(t);
  }
  var fn = typeof document > "u" ? null : document;
  function Hd(t, l, e) {
    var a = fn;
    if (a && typeof l == "string" && l) {
      var n = Bl(l);
      n = 'link[rel="' + t + '"][href="' + n + '"]', typeof e == "string" && (n += '[crossorigin="' + e + '"]'), Cd.has(n) || (Cd.add(n), t = { rel: t, crossOrigin: e, href: l }, a.querySelector(n) === null && (l = a.createElement("link"), rl(l, "link", t), tl(l), a.head.appendChild(l)));
    }
  }
  function l1(t) {
    ze.D(t), Hd("dns-prefetch", t, null);
  }
  function e1(t, l) {
    ze.C(t, l), Hd("preconnect", t, l);
  }
  function a1(t, l, e) {
    ze.L(t, l, e);
    var a = fn;
    if (a && t && l) {
      var n = 'link[rel="preload"][as="' + Bl(l) + '"]';
      l === "image" && e && e.imageSrcSet ? (n += '[imagesrcset="' + Bl(
        e.imageSrcSet
      ) + '"]', typeof e.imageSizes == "string" && (n += '[imagesizes="' + Bl(
        e.imageSizes
      ) + '"]')) : n += '[href="' + Bl(t) + '"]';
      var u = n;
      switch (l) {
        case "style":
          u = sn(t);
          break;
        case "script":
          u = on(t);
      }
      if (!(Ll.has(u) || (t = G(
        {
          rel: "preload",
          href: l === "image" && e && e.imageSrcSet ? void 0 : t,
          as: l
        },
        e
      ), Ll.set(u, t), a.querySelector(n) !== null || l === "style" && a.querySelector(au(u)) || l === "script" && a.querySelector(nu(u))))) {
        var i = a.createElement("link");
        rl(i, "link", t), l === "style" && (i[pu] = !0, i.onload = i.onerror = function() {
          Ks(i);
        }), tl(i), a.head.appendChild(i);
      }
    }
  }
  function n1(t, l) {
    ze.m(t, l);
    var e = fn;
    if (e && t) {
      var a = l && typeof l.as == "string" ? l.as : "script", n = 'link[rel="modulepreload"][as="' + Bl(a) + '"][href="' + Bl(t) + '"]', u = n;
      switch (a) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          u = on(t);
      }
      if (!Ll.has(u) && (t = G({ rel: "modulepreload", href: t }, l), Ll.set(u, t), e.querySelector(n) === null)) {
        switch (a) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (e.querySelector(nu(u)))
              return;
        }
        a = e.createElement("link"), rl(a, "link", t), tl(a), e.head.appendChild(a);
      }
    }
  }
  function u1(t, l, e) {
    ze.S(t, l, e);
    var a = fn;
    if (a && t) {
      var n = Oa(a).hoistableStyles, u = sn(t);
      l = l || "default";
      var i = n.get(u);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = a.querySelector(
          au(u)
        ))
          c.loading = 5;
        else {
          t = G(
            { rel: "stylesheet", href: t, "data-precedence": l },
            e
          ), (e = Ll.get(u)) && ms(t, e);
          var f = i = a.createElement("link");
          tl(f), rl(f, "link", t), f._p = new Promise(function(v, y) {
            f.onload = v, f.onerror = y;
          }), f.addEventListener("load", function() {
            c.loading |= 1;
          }), f.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, Ri(i, l, a);
        }
        i = {
          type: "stylesheet",
          instance: i,
          count: 1,
          state: c
        }, n.set(u, i);
      }
    }
  }
  function i1(t, l) {
    ze.X(t, l);
    var e = fn;
    if (e && t) {
      var a = Oa(e).hoistableScripts, n = on(t), u = a.get(n);
      u || (u = e.querySelector(nu(n)), u || (t = G({ src: t, async: !0 }, l), (l = Ll.get(n)) && gs(t, l), u = e.createElement("script"), tl(u), rl(u, "link", t), e.head.appendChild(u)), u = {
        type: "script",
        instance: u,
        count: 1,
        state: null
      }, a.set(n, u));
    }
  }
  function c1(t, l) {
    ze.M(t, l);
    var e = fn;
    if (e && t) {
      var a = Oa(e).hoistableScripts, n = on(t), u = a.get(n);
      u || (u = e.querySelector(nu(n)), u || (t = G({ src: t, async: !0, type: "module" }, l), (l = Ll.get(n)) && gs(t, l), u = e.createElement("script"), tl(u), rl(u, "link", t), e.head.appendChild(u)), u = {
        type: "script",
        instance: u,
        count: 1,
        state: null
      }, a.set(n, u));
    }
  }
  function jd(t, l, e, a) {
    var n = (n = Ne.current) ? eu(n) : null;
    if (!n) throw Error(s(446));
    switch (t) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof e.precedence == "string" && typeof e.href == "string" ? (e = sn(e.href), l = Oa(
          n
        ).hoistableStyles, a = l.get(e), a || (a = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, l.set(e, a)), a) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (e.rel === "stylesheet" && typeof e.href == "string" && typeof e.precedence == "string") {
          t = sn(e.href);
          var u = Oa(
            n
          ).hoistableStyles, i = u.get(t);
          if (i || (n = n.ownerDocument || n, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, u.set(t, i), (u = n.querySelector(
            au(t)
          )) ? u._p || (i.instance = u, i.state.loading = 5) : (u = Ll.get(t), u || (u = {
            rel: "preload",
            as: "style",
            href: e.href,
            crossOrigin: e.crossOrigin,
            integrity: e.integrity,
            media: e.media,
            hrefLang: e.hrefLang,
            referrerPolicy: e.referrerPolicy
          }, Ll.set(t, u)), f1(
            n,
            t,
            u,
            i.state
          ))), l && a === null)
            throw Error(s(528, ""));
          return i;
        }
        if (l && a !== null)
          throw Error(s(529, ""));
        return null;
      case "script":
        return l = e.async, e = e.src, typeof e == "string" && l && typeof l != "function" && typeof l != "symbol" ? (e = on(e), l = Oa(
          n
        ).hoistableScripts, a = l.get(e), a || (a = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, l.set(e, a)), a) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(s(444, t));
    }
  }
  function sn(t) {
    return 'href="' + Bl(t) + '"';
  }
  function au(t) {
    return 'link[rel="stylesheet"][' + t + "]";
  }
  function qd(t) {
    return G({}, t, {
      "data-precedence": t.precedence,
      precedence: null
    });
  }
  function f1(t, l, e, a) {
    if (l = t.querySelector(
      'link[rel="preload"][as="style"][' + l + "]"
    )) {
      if (l[pu] !== !0) {
        a.loading = 1;
        return;
      }
    } else
      l = t.createElement("link"), l[pu] = !0, l.onload = l.onerror = Ks.bind(null, l), rl(l, "link", e), tl(l), t.head.appendChild(l);
    a.preload = l, l.addEventListener("load", function() {
      return a.loading |= 1;
    }), l.addEventListener("error", function() {
      return a.loading |= 2;
    });
  }
  function on(t) {
    return '[src="' + Bl(t) + '"]';
  }
  function nu(t) {
    return "script[async]" + t;
  }
  function Bd(t, l, e) {
    if (l.count++, l.instance === null)
      switch (l.type) {
        case "style":
          var a = t.querySelector(
            'style[data-href~="' + Bl(e.href) + '"]'
          );
          if (a)
            return l.instance = a, tl(a), a;
          var n = G({}, e, {
            "data-href": e.href,
            "data-precedence": e.precedence,
            href: null,
            precedence: null
          });
          return a = (t.ownerDocument || t).createElement(
            "style"
          ), tl(a), rl(a, "style", n), Ri(a, e.precedence, t), l.instance = a;
        case "stylesheet":
          n = sn(e.href);
          var u = t.querySelector(
            au(n)
          );
          if (u)
            return l.state.loading |= 4, l.instance = u, tl(u), u;
          a = qd(e), (n = Ll.get(n)) && ms(a, n), u = (t.ownerDocument || t).createElement("link"), tl(u);
          var i = u;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), rl(u, "link", a), l.state.loading |= 4, Ri(u, e.precedence, t), l.instance = u;
        case "script":
          return u = on(e.src), (n = t.querySelector(
            nu(u)
          )) ? (l.instance = n, tl(n), n) : (a = e, (n = Ll.get(u)) && (a = G({}, e), gs(a, n)), t = t.ownerDocument || t, n = t.createElement("script"), tl(n), rl(n, "link", a), t.head.appendChild(n), l.instance = n);
        case "void":
          return null;
        default:
          throw Error(s(443, l.type));
      }
    else
      l.type === "stylesheet" && (l.state.loading & 4) === 0 && (a = l.instance, l.state.loading |= 4, Ri(a, e.precedence, t));
    return l.instance;
  }
  function Ri(t, l, e) {
    for (var a = e.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), n = a.length ? a[a.length - 1] : null, u = n, i = 0; i < a.length; i++) {
      var c = a[i];
      if (c.dataset.precedence === l) u = c;
      else if (u !== n) break;
    }
    u ? u.parentNode.insertBefore(t, u.nextSibling) : (l = e.nodeType === 9 ? e.head : e, l.insertBefore(t, l.firstChild));
  }
  function ms(t, l) {
    t.crossOrigin == null && (t.crossOrigin = l.crossOrigin), t.referrerPolicy == null && (t.referrerPolicy = l.referrerPolicy), t.title == null && (t.title = l.title);
  }
  function gs(t, l) {
    t.crossOrigin == null && (t.crossOrigin = l.crossOrigin), t.referrerPolicy == null && (t.referrerPolicy = l.referrerPolicy), t.integrity == null && (t.integrity = l.integrity);
  }
  var Ui = null;
  function Yd(t, l, e) {
    if (Ui === null) {
      var a = /* @__PURE__ */ new Map(), n = Ui = /* @__PURE__ */ new Map();
      n.set(e, a);
    } else
      n = Ui, a = n.get(e), a || (a = /* @__PURE__ */ new Map(), n.set(e, a));
    if (a.has(t)) return a;
    for (a.set(t, null), e = e.getElementsByTagName(t), n = 0; n < e.length; n++) {
      var u = e[n];
      if (!(u[Sn] || u[il] || t === "link" && u.getAttribute("rel") === "stylesheet") && u.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = u.getAttribute(l) || "";
        i = t + i;
        var c = a.get(i);
        c ? c.push(u) : a.set(i, [u]);
      }
    }
    return a;
  }
  function ys(t, l, e) {
    t = t.ownerDocument || t, t.head.insertBefore(
      e,
      l === "title" ? t.querySelector("head > title") : null
    );
  }
  function s1(t, l, e) {
    if (e === 1 || l.itemProp != null) return !1;
    switch (t) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof l.precedence != "string" || typeof l.href != "string" || l.href === "")
          break;
        return !0;
      case "link":
        if (typeof l.rel != "string" || typeof l.href != "string" || l.href === "" || l.onLoad || l.onError)
          break;
        switch (l.rel) {
          case "stylesheet":
            return t = l.disabled, typeof l.precedence == "string" && t == null;
          default:
            return !0;
        }
      case "script":
        if (l.async && typeof l.async != "function" && typeof l.async != "symbol" && !l.onLoad && !l.onError && l.src && typeof l.src == "string")
          return !0;
    }
    return !1;
  }
  function wd(t, l) {
    return t === "img" && l.src != null && l.src !== "" && l.onLoad == null && l.loading !== "lazy";
  }
  function Gd(t) {
    return !(t.type === "stylesheet" && (t.state.loading & 3) === 0);
  }
  function Xd(t) {
    return (t.width || 100) * (t.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Qd(t, l) {
    typeof l.decode == "function" && (t.imgCount++, l.complete || (t.imgBytes += Xd(l), t.suspenseyImages.push(l)), t = d1.bind(t), l.decode().then(t, t));
  }
  function o1(t, l, e, a) {
    if (e.type === "stylesheet" && (typeof a.media != "string" || matchMedia(a.media).matches !== !1) && (e.state.loading & 4) === 0) {
      if (e.instance === null) {
        var n = sn(a.href), u = l.querySelector(
          au(n)
        );
        if (u) {
          l = u._p, l !== null && typeof l == "object" && typeof l.then == "function" && (t.count++, t = uu.bind(t), l.then(t, t)), e.state.loading |= 4, e.instance = u, tl(u);
          return;
        }
        u = l.ownerDocument || l, a = qd(a), (n = Ll.get(n)) && ms(a, n), u = u.createElement("link"), tl(u);
        var i = u;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), rl(u, "link", a), e.instance = u;
      }
      t.stylesheets === null && (t.stylesheets = /* @__PURE__ */ new Map()), t.stylesheets.set(e, l), (l = e.state.preload) && (e.state.loading & 3) === 0 && (t.count++, e = uu.bind(t), l.addEventListener("load", e), l.addEventListener("error", e));
    }
  }
  var Ci = 0;
  function r1(t, l) {
    return t.stylesheets && t.count === 0 && ji(t, t.stylesheets), 0 < t.count || 0 < t.imgCount ? function(e) {
      var a = setTimeout(function() {
        if (t.stylesheets && ji(t, t.stylesheets), t.unsuspend) {
          var u = t.unsuspend;
          t.unsuspend = null, u();
        }
      }, 6e4 + l);
      0 < t.imgBytes && Ci === 0 && (Ci = 62500 * xm());
      var n = setTimeout(
        function() {
          if (t.waitingForImages = !1, t.count === 0 && (t.stylesheets && ji(t, t.stylesheets), t.unsuspend)) {
            var u = t.unsuspend;
            t.unsuspend = null, u();
          }
        },
        (t.imgBytes > Ci ? 50 : 800) + l
      );
      return t.unsuspend = e, function() {
        t.unsuspend = null, clearTimeout(a), clearTimeout(n);
      };
    } : null;
  }
  function Zd(t) {
    if (t.count === 0 && (t.imgCount === 0 || !t.waitingForImages)) {
      if (t.stylesheets) ji(t, t.stylesheets);
      else if (t.unsuspend) {
        var l = t.unsuspend;
        t.unsuspend = null, l();
      }
    }
  }
  function uu() {
    this.count--, Zd(this);
  }
  function d1() {
    this.imgCount--, Zd(this);
  }
  var Hi = null;
  function ji(t, l) {
    t.stylesheets = null, t.unsuspend !== null && (t.count++, Hi = /* @__PURE__ */ new Map(), l.forEach(h1, t), Hi = null, uu.call(t));
  }
  function h1(t, l) {
    if (!(l.state.loading & 4)) {
      var e = Hi.get(t);
      if (e) var a = e.get(null);
      else {
        e = /* @__PURE__ */ new Map(), Hi.set(t, e);
        for (var n = t.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), u = 0; u < n.length; u++) {
          var i = n[u];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (e.set(i.dataset.precedence, i), a = i);
        }
        a && e.set(null, a);
      }
      n = l.instance, i = n.getAttribute("data-precedence"), u = e.get(i) || a, u === a && e.set(null, n), e.set(i, n), this.count++, a = uu.bind(this), n.addEventListener("load", a), n.addEventListener("error", a), u ? u.parentNode.insertBefore(n, u.nextSibling) : (t = t.nodeType === 9 ? t.head : t, t.insertBefore(n, t.firstChild)), l.state.loading |= 4;
    }
  }
  var rn = {
    $$typeof: Mt,
    Provider: null,
    Consumer: null,
    _currentValue: Q,
    _currentValue2: Q,
    _threadCount: 0
  };
  function v1(t, l, e, a, n, u, i, c, f) {
    this.tag = 1, this.containerInfo = t, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Fi(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Fi(0), this.hiddenUpdates = Fi(null), this.identifierPrefix = a, this.onUncaughtError = n, this.onCaughtError = u, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Vd(t, l, e, a, n, u, i, c, f, v, y, _) {
    return t = new v1(
      t,
      l,
      e,
      i,
      f,
      v,
      y,
      _,
      c
    ), l = 1, u === !0 && (l |= 24), u = pl(3, null, null, l), t.current = u, u.stateNode = t, l = Rc(), l.refCount++, t.pooledCache = l, l.refCount++, u.memoizedState = {
      element: a,
      isDehydrated: e,
      cache: l
    }, jc(u), t;
  }
  function Ld(t) {
    return t ? (t = qa, t) : qa;
  }
  function Kd(t, l, e, a, n, u) {
    n = Ld(n), a.context === null ? a.context = n : a.pendingContext = n, a = qe(l), a.payload = { element: e }, u = u === void 0 ? null : u, u !== null && (a.callback = u), e = Be(t, a, l), e !== null && (zl(e, t, l), qn(e, t, l));
  }
  function Jd(t, l) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var e = t.retryLane;
      t.retryLane = e !== 0 && e < l ? e : l;
    }
  }
  function bs(t, l) {
    Jd(t, l), (t = t.alternate) && Jd(t, l);
  }
  function $d(t) {
    if (t.tag === 13 || t.tag === 31) {
      var l = ua(t, 67108864);
      l !== null && zl(l, t, 67108864), bs(t, 67108864);
    }
  }
  function kd(t) {
    if (t.tag === 13 || t.tag === 31) {
      var l = Hl();
      l = Wi(l);
      var e = ua(t, l);
      e !== null && zl(e, t, l), bs(t, l);
    }
  }
  var dn = !0;
  function m1(t, l, e, a) {
    var n = C.T;
    C.T = null;
    var u = z.p;
    try {
      z.p = 2, Ss(t, l, e, a);
    } finally {
      z.p = u, C.T = n;
    }
  }
  function g1(t, l, e, a) {
    var n = C.T;
    C.T = null;
    var u = z.p;
    try {
      z.p = 8, Ss(t, l, e, a);
    } finally {
      z.p = u, C.T = n;
    }
  }
  function Ss(t, l, e, a) {
    if (dn) {
      var n = ps(a);
      if (n === null)
        ts(
          t,
          l,
          a,
          qi,
          e
        ), Wd(t, a);
      else if (b1(
        n,
        t,
        l,
        e,
        a
      ))
        a.stopPropagation();
      else if (Wd(t, a), l & 4 && -1 < y1.indexOf(t)) {
        for (; n !== null; ) {
          var u = Na(n);
          if (u !== null)
            switch (u.tag) {
              case 3:
                if (u = u.stateNode, u.current.memoizedState.isDehydrated) {
                  var i = ta(u.pendingLanes);
                  if (i !== 0) {
                    var c = u;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var f = 1 << 31 - Al(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    se(u), (_t & 6) === 0 && (Ti = Nl() + 500, In(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = ua(u, 2), c !== null && zl(c, u, 2), zi(), bs(u, 2);
            }
          if (u = ps(a), u === null && ts(
            t,
            l,
            a,
            qi,
            e
          ), u === n) break;
          n = u;
        }
        n !== null && a.stopPropagation();
      } else
        ts(
          t,
          l,
          a,
          null,
          e
        );
    }
  }
  function ps(t) {
    return t = nc(t), Ts(t);
  }
  var qi = null;
  function Ts(t) {
    if (qi = null, t = la(t), t !== null) {
      var l = k(t);
      if (l === null) t = null;
      else {
        var e = l.tag;
        if (e === 13) {
          if (t = nt(l), t !== null) return t;
          t = null;
        } else if (e === 31) {
          if (t = Nt(l), t !== null) return t;
          t = null;
        } else if (e === 3) {
          if (l.stateNode.current.memoizedState.isDehydrated)
            return l.tag === 3 ? l.stateNode.containerInfo : null;
          t = null;
        } else l !== t && (t = null);
      }
    }
    return qi = t, null;
  }
  function Fd(t) {
    switch (t) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "fullscreenerror":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "resize":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (xh()) {
          case Hs:
            return 2;
          case js:
            return 8;
          case mu:
          case Dh:
            return 32;
          case qs:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var Es = !1, ke = null, Fe = null, We = null, iu = /* @__PURE__ */ new Map(), cu = /* @__PURE__ */ new Map(), Ie = [], y1 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Wd(t, l) {
    switch (t) {
      case "focusin":
      case "focusout":
        ke = null;
        break;
      case "dragenter":
      case "dragleave":
        Fe = null;
        break;
      case "mouseover":
      case "mouseout":
        We = null;
        break;
      case "pointerover":
      case "pointerout":
        iu.delete(l.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        cu.delete(l.pointerId);
    }
  }
  function fu(t, l, e, a, n, u) {
    return t === null || t.nativeEvent !== u ? (t = {
      blockedOn: l,
      domEventName: e,
      eventSystemFlags: a,
      nativeEvent: u,
      targetContainers: [n]
    }, l !== null && (l = Na(l), l !== null && $d(l)), t) : (t.eventSystemFlags |= a, l = t.targetContainers, n !== null && l.indexOf(n) === -1 && l.push(n), t);
  }
  function b1(t, l, e, a, n) {
    switch (l) {
      case "focusin":
        return ke = fu(
          ke,
          t,
          l,
          e,
          a,
          n
        ), !0;
      case "dragenter":
        return Fe = fu(
          Fe,
          t,
          l,
          e,
          a,
          n
        ), !0;
      case "mouseover":
        return We = fu(
          We,
          t,
          l,
          e,
          a,
          n
        ), !0;
      case "pointerover":
        var u = n.pointerId;
        return iu.set(
          u,
          fu(
            iu.get(u) || null,
            t,
            l,
            e,
            a,
            n
          )
        ), !0;
      case "gotpointercapture":
        return u = n.pointerId, cu.set(
          u,
          fu(
            cu.get(u) || null,
            t,
            l,
            e,
            a,
            n
          )
        ), !0;
    }
    return !1;
  }
  function Id(t) {
    var l = la(t.target);
    if (l !== null) {
      var e = k(l);
      if (e !== null) {
        if (l = e.tag, l === 13) {
          if (l = nt(e), l !== null) {
            t.blockedOn = l, Zs(t.priority, function() {
              kd(e);
            });
            return;
          }
        } else if (l === 31) {
          if (l = Nt(e), l !== null) {
            t.blockedOn = l, Zs(t.priority, function() {
              kd(e);
            });
            return;
          }
        } else if (l === 3 && e.stateNode.current.memoizedState.isDehydrated) {
          t.blockedOn = e.tag === 3 ? e.stateNode.containerInfo : null;
          return;
        }
      }
    }
    t.blockedOn = null;
  }
  function Bi(t) {
    if (t.blockedOn !== null) return !1;
    for (var l = t.targetContainers; 0 < l.length; ) {
      var e = ps(t.nativeEvent);
      if (e === null) {
        e = t.nativeEvent;
        var a = new e.constructor(
          e.type,
          e
        );
        ac = a, e.target.dispatchEvent(a), ac = null;
      } else
        return l = Na(e), l !== null && $d(l), t.blockedOn = e, !1;
      l.shift();
    }
    return !0;
  }
  function Pd(t, l, e) {
    Bi(t) && e.delete(l);
  }
  function S1() {
    Es = !1, ke !== null && Bi(ke) && (ke = null), Fe !== null && Bi(Fe) && (Fe = null), We !== null && Bi(We) && (We = null), iu.forEach(Pd), cu.forEach(Pd);
  }
  function Yi(t, l) {
    t.blockedOn === l && (t.blockedOn = null, Es || (Es = !0, b.unstable_scheduleCallback(
      b.unstable_NormalPriority,
      S1
    )));
  }
  var wi = null;
  function th(t) {
    wi !== t && (wi = t, b.unstable_scheduleCallback(
      b.unstable_NormalPriority,
      function() {
        wi === t && (wi = null);
        for (var l = 0; l < t.length; l += 3) {
          var e = t[l], a = t[l + 1], n = t[l + 2];
          if (typeof a != "function") {
            if (Ts(a || e) === null)
              continue;
            break;
          }
          var u = Na(e);
          u !== null && (t.splice(l, 3), l -= 3, ef(
            u,
            {
              pending: !0,
              data: n,
              method: e.method,
              action: a
            },
            a,
            n
          ));
        }
      }
    ));
  }
  function hn(t) {
    function l(f) {
      return Yi(f, t);
    }
    ke !== null && Yi(ke, t), Fe !== null && Yi(Fe, t), We !== null && Yi(We, t), iu.forEach(l), cu.forEach(l);
    for (var e = 0; e < Ie.length; e++) {
      var a = Ie[e];
      a.blockedOn === t && (a.blockedOn = null);
    }
    for (; 0 < Ie.length && (e = Ie[0], e.blockedOn === null); )
      Id(e), e.blockedOn === null && Ie.shift();
    if (e = (t.ownerDocument || t).$$reactFormReplay, e != null)
      for (a = 0; a < e.length; a += 3) {
        var n = e[a], u = e[a + 1], i = n[Sl] || null;
        if (typeof u == "function")
          i || th(e);
        else if (i) {
          var c = null;
          if (u && u.hasAttribute("formAction")) {
            if (n = u, i = u[Sl] || null)
              c = i.formAction;
            else if (Ts(n) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? e[a + 1] = c : (e.splice(a, 3), a -= 3), th(e);
        }
      }
  }
  function lh() {
    function t(u) {
      u.canIntercept && u.info === "react-transition" && u.intercept({
        handler: function() {
          return new Promise(function(i) {
            return n = i;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function l() {
      n !== null && (n(), n = null), a || setTimeout(e, 20);
    }
    function e() {
      if (!a && !navigation.transition) {
        var u = navigation.currentEntry;
        u && u.url != null && navigation.navigate(u.url, {
          state: u.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var a = !1, n = null;
      return navigation.addEventListener("navigate", t), navigation.addEventListener("navigatesuccess", l), navigation.addEventListener("navigateerror", l), setTimeout(e, 100), function() {
        a = !0, navigation.removeEventListener("navigate", t), navigation.removeEventListener("navigatesuccess", l), navigation.removeEventListener("navigateerror", l), n !== null && (n(), n = null);
      };
    }
  }
  function _s(t) {
    this._internalRoot = t;
  }
  Gi.prototype.render = _s.prototype.render = function(t) {
    var l = this._internalRoot;
    if (l === null) throw Error(s(409));
    var e = l.current, a = Hl();
    Kd(e, a, t, l, null, null);
  }, Gi.prototype.unmount = _s.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var l = t.containerInfo;
      Kd(t.current, 2, null, t, null, null), zi(), l[za] = null;
    }
  };
  function Gi(t) {
    this._internalRoot = t;
  }
  Gi.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var l = Qs();
      t = { blockedOn: null, target: t, priority: l };
      for (var e = 0; e < Ie.length && l !== 0 && l < Ie[e].priority; e++) ;
      Ie.splice(e, 0, t), e === 0 && Id(t);
    }
  };
  var eh = O.version;
  if (eh !== "19.3.1")
    throw Error(
      s(
        527,
        eh,
        "19.3.1"
      )
    );
  z.findDOMNode = function(t) {
    var l = t._reactInternals;
    if (l === void 0)
      throw typeof t.render == "function" ? Error(s(188)) : (t = Object.keys(t).join(","), Error(s(268, t)));
    return t = pt(l), t = t !== null ? q(t) : null, t = t === null ? null : t.stateNode, t;
  };
  var p1 = {
    bundleType: 0,
    version: "19.3.1",
    rendererPackageName: "react-dom",
    currentDispatcherRef: C,
    reconcilerVersion: "19.3.1"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Xi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Xi.isDisabled && Xi.supportsFiber)
      try {
        gn = Xi.inject(
          p1
        ), Ol = Xi;
      } catch {
      }
  }
  return ou.createRoot = function(t, l) {
    if (!x(t)) throw Error(s(299));
    var e = !1, a = "", n = Lr, u = Kr, i = Jr;
    return l != null && (l.unstable_strictMode === !0 && (e = !0), l.identifierPrefix !== void 0 && (a = l.identifierPrefix), l.onUncaughtError !== void 0 && (n = l.onUncaughtError), l.onCaughtError !== void 0 && (u = l.onCaughtError), l.onRecoverableError !== void 0 && (i = l.onRecoverableError)), l = Vd(
      t,
      1,
      !1,
      null,
      null,
      e,
      a,
      null,
      n,
      u,
      i,
      lh
    ), t[za] = l.current, Pf(t), new _s(l);
  }, ou.hydrateRoot = function(t, l, e) {
    if (!x(t)) throw Error(s(299));
    var a = !1, n = "", u = Lr, i = Kr, c = Jr, f = null;
    return e != null && (e.unstable_strictMode === !0 && (a = !0), e.identifierPrefix !== void 0 && (n = e.identifierPrefix), e.onUncaughtError !== void 0 && (u = e.onUncaughtError), e.onCaughtError !== void 0 && (i = e.onCaughtError), e.onRecoverableError !== void 0 && (c = e.onRecoverableError), e.formState !== void 0 && (f = e.formState)), l = Vd(
      t,
      1,
      !0,
      l,
      e ?? null,
      a,
      n,
      f,
      u,
      i,
      c,
      lh
    ), l.context = Ld(null), e = l.current, a = Hl(), a = Wi(a), n = qe(a), n.callback = null, Be(e, n, a), e = a, l.current.lanes = e, bn(l, e), se(l), t[za] = l.current, Pf(t), new Gi(l);
  }, ou.version = "19.3.1", ou;
}
var dh;
function D1() {
  if (dh) return Os.exports;
  dh = 1;
  function b() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(b);
      } catch (O) {
        console.error(O);
      }
  }
  return b(), Os.exports = x1(), Os.exports;
}
var vn = D1();
const Il = (b) => Math.round(b * 100) / 100;
function R1(b, O, N, { rtl: s = !1 } = {}) {
  const x = N - O, k = Math.abs(x) / 2;
  if (!k) return `H${Il(b)}`;
  const nt = s ? -1 : 1, Nt = O + x / 2, lt = x > 0 ? 1 : 0, pt = s ? 1 - lt : lt, q = s ? lt : 1 - lt, p = Il(k);
  return `H${Il(b - nt * k)}A${p} ${p} 0 0 ${pt} ${Il(b)} ${Il(Nt)}A${p} ${p} 0 0 ${q} ${Il(b + nt * k)} ${Il(N)}`;
}
function U1(b, O, N) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Il(O)} ${Il(N)}" preserveAspectRatio="none"><path d="${b}" fill="#000"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
}
function Qi(b = 0.75, O = 40) {
  const N = Math.max(0.2, Math.min(1, 1 - 0.6 * b)), s = 6.2 / N, x = [];
  for (let k = 0; k <= O; k++) {
    const nt = k / O;
    let Nt;
    if (N >= 0.999)
      Nt = 1 - (1 + s * nt) * Math.exp(-s * nt);
    else {
      const lt = s * Math.sqrt(1 - N * N);
      Nt = 1 - Math.exp(-N * s * nt) * (Math.cos(lt * nt) + N * s / lt * Math.sin(lt * nt));
    }
    x.push(Math.round(Nt * 1e4) / 1e4);
  }
  return x[0] = 0, x[x.length - 1] = 1, `linear(${x.join(", ")})`;
}
const hh = {
  paper: {
    background: "#ffffff",
    label: "#ffffff",
    plate: "#e9ff3d",
    plateText: "#0d0f12",
    control: "#111317",
    controlIcon: "#ffffff",
    controlHover: "#2a2e36",
    counter: "rgba(17, 19, 23, 0.42)",
    counterText: "#ffffff",
    shadow: "rgba(24, 26, 34, 0.26)"
  },
  ink: {
    background: "#0c0e12",
    label: "#ffffff",
    plate: "#e9ff3d",
    plateText: "#0d0f12",
    control: "#ffffff",
    controlIcon: "#111317",
    controlHover: "#d9dde4",
    counter: "rgba(255, 255, 255, 0.3)",
    counterText: "#ffffff",
    shadow: "rgba(0, 0, 0, 0.6)"
  },
  bone: {
    background: "#f2ede4",
    label: "#ffffff",
    plate: "#1d1f24",
    plateText: "#f7f4ee",
    control: "#1d1f24",
    controlIcon: "#f7f4ee",
    controlHover: "#3a3d45",
    counter: "rgba(29, 31, 36, 0.4)",
    counterText: "#ffffff",
    shadow: "rgba(86, 70, 48, 0.28)"
  },
  ultra: {
    background: "#101014",
    label: "#ffffff",
    plate: "#ff4d2e",
    plateText: "#ffffff",
    control: "#ff4d2e",
    controlIcon: "#ffffff",
    controlHover: "#ff6b52",
    counter: "rgba(255, 255, 255, 0.28)",
    counterText: "#ffffff",
    shadow: "rgba(0, 0, 0, 0.62)"
  }
}, Ds = (b, O, N) => b < O ? O : b > N ? N : b;
function vh(b, O) {
  const N = Math.abs(b);
  return {
    rot: b * O.angle,
    dy: N * O.rise,
    scale: Math.max(0.3, 1 - N * O.falloff),
    /* 1 on the focused card, 0 by the time it is a full place away. Drives
       everything that only the focused card should carry. */
    t: Math.max(0, 1 - N),
    away: N
  };
}
function C1({
  items: b = [],
  preset: O = "paper",
  theme: N,
  /* --- the deck. Lengths are fractions of the container's width, so the fan
     holds its proportions at any size. ------------------------------------ */
  cardWidth: s = 0.35,
  /* Height over width. 2:3, the shape the reference uses. */
  cardRatio: x = 1.51,
  cornerRadius: k = 0.05,
  /* Degrees of swing per place from the middle. */
  angle: nt = 16,
  /* Where the hinge sits, as a multiple of the card's height measured from its
     top edge. Past 1 it is below the card, which is what opens the fan. */
  hinge: Nt = 1.6,
  /* Extra drop per place, on top of what the swing already gives. */
  rise: lt = 0.025,
  /* How much smaller each place out is. */
  falloff: pt = 0.06,
  /* Places drawn either side of the focused card. */
  reach: q = 2,
  /* What the artwork sits at before its card takes focus, so taking focus
     also eases the zoom out. */
  zoom: p = 1.07,
  /* Height of the aspect box the fan is dealt into. */
  aspect: Y = 1.44,
  /* --- motion ----------------------------------------------------------- */
  /* Seconds for the deck to resettle. */
  speed: Ut = 0.78,
  /* 0 is a critically damped glide; 1 overshoots about a quarter. */
  bounce: jt = 0.3,
  /* How far the pointer must travel to turn the deck by one card, as a
     fraction of the container's width. */
  swipe: Ot = 0.14,
  dragSensitivity: F = 1,
  /* Seconds between advances. The deck turns back at the ends rather than
     racing home. Set 0 to hide the play button entirely. */
  autoplay: Tt = 4.5,
  playing: At,
  /* --- behaviour --------------------------------------------------------- */
  startIndex: ul,
  controls: bt = !0,
  counter: I = !0,
  onChange: ut,
  className: G = "",
  style: W,
  ...Pt
}) {
  const Bt = at.useMemo(() => b.filter(Boolean), [b]), dt = Bt.length, Ct = at.useRef(null), Qt = at.useRef([]), [ht, Mt] = at.useState(
    () => Ds(ul ?? Math.floor((dt - 1) / 2), 0, Math.max(0, dt - 1))
  ), [M, R] = at.useState(At ?? !1), X = { angle: nt, rise: lt, falloff: pt }, w = at.useMemo(() => Qi(jt), [jt]), V = at.useRef(ht);
  V.current = ht;
  const Et = (z) => {
    const Q = Ds(z, 0, dt - 1);
    Q !== V.current && (V.current = Q, Mt(Q), ut == null || ut(Q, Bt[Q]));
  }, Wt = (z, Q) => {
    const mt = Ct.current;
    if (mt) {
      mt.classList.toggle("deck--dragging", !!Q);
      for (let vt = 0; vt < Qt.current.length; vt++) {
        const st = Qt.current[vt];
        if (!st) continue;
        const it = vh(vt - z, X);
        st.style.setProperty("--deck-rot", `${it.rot}deg`), st.style.setProperty("--deck-dy", `${it.dy * 100}cqw`), st.style.setProperty("--deck-sc", `${it.scale}`), st.style.setProperty("--deck-t", `${it.t}`), st.style.opacity = it.away > q + 0.6 ? "0" : "1", st.style.zIndex = `${Math.max(1, Math.round(100 - it.away * 10))}`;
      }
    }
  }, Zt = at.useRef({ active: !1, id: null, startX: 0, moved: !1, width: 1, offset: 0 }), r = (z) => {
    var mt, vt, st;
    if (z.button != null && z.button !== 0 || (vt = (mt = z.target).closest) != null && vt.call(mt, ".deck-controls")) return;
    const Q = Zt.current;
    Q.active = !0, Q.id = z.pointerId, Q.startX = z.clientX, Q.moved = !1, Q.offset = 0, Q.width = ((st = Ct.current) == null ? void 0 : st.getBoundingClientRect().width) || 1;
  }, S = (z) => {
    var gt, vl;
    const Q = Zt.current;
    if (!Q.active || Q.id !== z.pointerId) return;
    const mt = z.clientX - Q.startX;
    if (!Q.moved) {
      if (Math.abs(mt) <= 4) return;
      Q.moved = !0, (vl = (gt = z.currentTarget).setPointerCapture) == null || vl.call(gt, z.pointerId);
    }
    let vt = -mt / (Q.width * Ot) * F;
    const st = -ht, it = dt - 1 - ht;
    vt < st && (vt = st + (vt - st) * 0.28), vt > it && (vt = it + (vt - it) * 0.28), Q.offset = vt, Wt(ht + vt, !0);
  }, A = (z) => {
    var vt;
    const Q = Zt.current;
    if (Q.id !== z.pointerId || (Q.active = !1, Q.id = null, !Q.moved)) return;
    const mt = Ds(ht + Math.round(Q.offset), 0, dt - 1);
    Q.offset = 0, (vt = Ct.current) == null || vt.classList.remove("deck--dragging"), mt === ht ? Wt(ht, !1) : Et(mt), setTimeout(() => Q.moved = !1, 0);
  };
  at.useEffect(() => {
    Zt.current.active || Wt(ht, !1);
  }, [ht, dt, nt, lt, pt, q]), at.useEffect(() => {
    if (!M || !Tt || dt < 2) return;
    let z = 1;
    const Q = setInterval(() => {
      const mt = V.current;
      (mt + z > dt - 1 || mt + z < 0) && (z = -z), Et(mt + z);
    }, Tt * 1e3);
    return () => clearInterval(Q);
  }, [M, Tt, dt]), at.useEffect(() => {
    At !== void 0 && R(At);
  }, [At]);
  const U = (z) => {
    const Q = z.key === "ArrowRight" ? 1 : z.key === "ArrowLeft" ? -1 : 0;
    if (Q) {
      z.preventDefault(), Et(ht + Q);
      return;
    }
    z.key === "Home" && (z.preventDefault(), Et(0)), z.key === "End" && (z.preventDefault(), Et(dt - 1));
  }, j = { ...hh[O] || hh.paper, ...N }, J = {
    "--deck-bg": j.background,
    "--deck-label": j.label,
    "--deck-plate": j.plate,
    "--deck-plate-text": j.plateText,
    "--deck-control": j.control,
    "--deck-control-icon": j.controlIcon,
    "--deck-control-hover": j.controlHover,
    "--deck-counter": j.counter,
    "--deck-counter-text": j.counterText,
    "--deck-shadow-color": j.shadow,
    "--deck-aspect": Y,
    "--deck-card-w": `${s * 100}cqw`,
    "--deck-card-h": `${s * x * 100}cqw`,
    "--deck-corner": `${k * s * 100}cqw`,
    "--deck-hinge": `${Nt * 100}%`,
    "--deck-zoom": p,
    "--deck-speed": `${Ut}s`,
    "--deck-ease": w,
    ...W
  };
  if (!dt) return null;
  const K = Zt.current, C = K.active && K.moved ? ht + K.offset : ht;
  return /* @__PURE__ */ T.jsxs(
    "div",
    {
      ref: Ct,
      className: `deck${G ? ` ${G}` : ""}`,
      style: J,
      role: "region",
      "aria-roledescription": "carousel",
      "aria-label": "Card deck",
      tabIndex: 0,
      onKeyDown: U,
      onPointerDown: r,
      onPointerMove: S,
      onPointerUp: A,
      onPointerCancel: A,
      ...Pt,
      children: [
        /* @__PURE__ */ T.jsx("div", { className: "deck-stage", children: Bt.map((z, Q) => {
          const mt = vh(Q - C, X), vt = mt.away > q + 0.6, st = Q === ht;
          return /* @__PURE__ */ T.jsxs(
            "div",
            {
              ref: (it) => Qt.current[Q] = it,
              className: `deck-card${st ? " is-focused" : ""}`,
              style: {
                "--deck-rot": `${mt.rot}deg`,
                "--deck-dy": `${mt.dy * 100}cqw`,
                "--deck-sc": mt.scale,
                "--deck-t": mt.t,
                opacity: vt ? 0 : 1,
                zIndex: Math.max(1, Math.round(100 - mt.away * 10)),
                pointerEvents: vt ? "none" : void 0
              },
              role: "group",
              "aria-roledescription": "slide",
              "aria-label": z.title ?? z.label ?? `Slide ${Q + 1} of ${dt}`,
              "aria-hidden": st ? void 0 : "true",
              onClick: () => {
                Zt.current.moved || st || Et(Q);
              },
              children: [
                z.image ? /* @__PURE__ */ T.jsx(
                  "img",
                  {
                    className: "deck-media",
                    src: z.image,
                    alt: z.alt ?? "",
                    draggable: "false",
                    decoding: "async",
                    loading: mt.away <= q ? "eager" : "lazy"
                  }
                ) : (
                  /* Stands in until real artwork arrives; it unzooms on focus
                     exactly as an image would. */
                  /* @__PURE__ */ T.jsx("span", { className: "deck-media", style: { background: z.art } })
                ),
                /* @__PURE__ */ T.jsx("span", { className: "deck-scrim", "aria-hidden": "true" }),
                z.label && /* @__PURE__ */ T.jsx("span", { className: "deck-label", children: z.label }),
                (z.title || z.cta) && /* @__PURE__ */ T.jsxs("span", { className: "deck-plate", children: [
                  z.title && /* @__PURE__ */ T.jsx("span", { className: "deck-plate-title", children: z.title }),
                  z.cta && (z.href ? /* @__PURE__ */ T.jsxs(
                    "a",
                    {
                      className: "deck-plate-cta",
                      href: z.href,
                      tabIndex: st ? void 0 : -1,
                      onClick: (it) => {
                        Zt.current.moved && it.preventDefault();
                      },
                      children: [
                        z.cta,
                        " ",
                        /* @__PURE__ */ T.jsx("span", { "aria-hidden": "true", children: "→" })
                      ]
                    }
                  ) : /* @__PURE__ */ T.jsxs("span", { className: "deck-plate-cta", children: [
                    z.cta,
                    " ",
                    /* @__PURE__ */ T.jsx("span", { "aria-hidden": "true", children: "→" })
                  ] }))
                ] })
              ]
            },
            z.id ?? Q
          );
        }) }),
        bt && /* @__PURE__ */ T.jsxs("div", { className: "deck-controls", children: [
          I && /* @__PURE__ */ T.jsxs("span", { className: "deck-counter", "aria-live": "polite", children: [
            ht + 1,
            "/",
            dt
          ] }),
          /* @__PURE__ */ T.jsxs("div", { className: "deck-buttons", children: [
            /* @__PURE__ */ T.jsx(
              "button",
              {
                type: "button",
                className: "deck-btn",
                "aria-label": "Previous card",
                disabled: ht === 0,
                onClick: () => Et(ht - 1),
                children: /* @__PURE__ */ T.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("path", { d: "M14.5 5.5 8 12l6.5 6.5" }) })
              }
            ),
            Tt > 0 && /* @__PURE__ */ T.jsx(
              "button",
              {
                type: "button",
                className: "deck-btn deck-btn--play",
                "aria-label": M ? "Pause" : "Play",
                "aria-pressed": M,
                onClick: () => R((z) => !z),
                children: M ? /* @__PURE__ */ T.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("path", { d: "M9.5 6v12M14.5 6v12" }) }) : /* @__PURE__ */ T.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("path", { d: "M8.5 5.8 17 12l-8.5 6.2Z", className: "deck-fill" }) })
              }
            ),
            /* @__PURE__ */ T.jsx(
              "button",
              {
                type: "button",
                className: "deck-btn",
                "aria-label": "Next card",
                disabled: ht === dt - 1,
                onClick: () => Et(ht + 1),
                children: /* @__PURE__ */ T.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("path", { d: "M9.5 5.5 16 12l-6.5 6.5" }) })
              }
            )
          ] })
        ] })
      ]
    }
  );
}
const mh = {
  paper: { background: "#ffffff", panel: "#f3f3f3", title: "#0a0a0a", text: "#555555", badge: "rgba(0, 0, 0, 0.06)", badgeText: "#0a0a0a", accent: "#0a0a0a", accentText: "#ffffff" },
  night: { background: "#0d0e10", panel: "#191b1f", title: "#f2f2f2", text: "#9a9ca3", badge: "rgba(255, 255, 255, 0.08)", badgeText: "#f2f2f2", accent: "#f2f2f2", accentText: "#0d0e10" },
  clay: { background: "#f6f1ea", panel: "#ece3d6", title: "#2a1f17", text: "#6e5f52", badge: "rgba(42, 31, 23, 0.07)", badgeText: "#2a1f17", accent: "#b4532a", accentText: "#fff6ee" }
}, H1 = Qi(0.35);
function j1({
  items: b = [],
  preset: O = "paper",
  theme: N,
  label: s = "How it works",
  /* Shown above the list when set. */
  heading: x,
  /* --- layout. Lengths are fractions of the component's width. ----------- */
  /* Width of the list column; the picture takes the rest after `gap`. */
  listWidth: k = 0.47,
  gap: nt = 0.04,
  /* Picture height over width. */
  imageRatio: Nt = 0.54,
  /* Corner radius of the picture and the open panel, px. */
  radius: lt = 24,
  panelRadius: pt = 20,
  /* 'right' or 'left'. */
  imageSide: q = "right",
  stackBelow: p = 720,
  /* --- behaviour ---------------------------------------------------------- */
  startIndex: Y = 0,
  /* Clicking the open step closes it. */
  collapsible: Ut = !1,
  /* Seconds per step; 0 is off. */
  autoplay: jt = 2,
  pauseOnHover: Ot = !0,
  /* Seconds for the panel and the picture to move. */
  duration: F = 0.55,
  onChange: Tt,
  className: At = "",
  style: ul,
  ...bt
}) {
  const I = { ...mh[O] || mh.paper, ...N }, ut = b.length, [G, W] = at.useState(Y), [Pt, Bt] = at.useState(!1), [dt, Ct] = at.useState(!1), [Qt, ht] = at.useState(0), Mt = at.useRef(null), M = at.useRef(null), R = at.useRef([]), X = at.useRef(null);
  at.useLayoutEffect(() => {
    const S = Mt.current, A = M.current;
    if (!S || !A) return;
    const U = () => {
      var st, it, gt;
      if (Ct(S.clientWidth < p), G < 0) return;
      const J = R.current.slice(0, G).filter(Boolean), K = parseFloat(getComputedStyle(A).rowGap) || 0;
      let C = 0;
      for (const vl of J) C += vl.querySelector(".sa__head").offsetHeight + K;
      const z = ((st = X.current) == null ? void 0 : st.offsetHeight) || 0, Q = ((it = R.current[0]) == null ? void 0 : it.querySelector(".sa__head").offsetHeight) || 0, mt = ((gt = R.current[G]) == null ? void 0 : gt.querySelector(".sa__inner").scrollHeight) || 0, vt = ut * Q + (ut - 1) * K + mt;
      ht(Math.max(0, Math.min(C, vt - z)));
    };
    U();
    const j = new ResizeObserver(U);
    return j.observe(S), () => j.disconnect();
  }, [G, ut, p]), at.useEffect(() => {
    Tt == null || Tt(G);
  }, [G]);
  const w = typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, V = jt > 0 && ut > 1 && !(Ot && Pt) && !w && G >= 0;
  at.useEffect(() => {
    if (!V) return;
    const S = setTimeout(() => W((A) => (A + 1) % ut), jt * 1e3);
    return () => clearTimeout(S);
  }, [V, G, jt, ut]);
  const Et = (S) => W((A) => A === S && Ut ? -1 : S), Wt = (S, A) => {
    var J;
    const U = R.current.map((K) => K == null ? void 0 : K.querySelector(".sa__head"));
    let j = -1;
    S.key === "ArrowDown" ? j = (A + 1) % ut : S.key === "ArrowUp" ? j = (A - 1 + ut) % ut : S.key === "Home" ? j = 0 : S.key === "End" && (j = ut - 1), !(j < 0) && (S.preventDefault(), (J = U[j]) == null || J.focus());
  }, Zt = {
    "--sa-list": `${k * 100}cqw`,
    "--sa-gap": `${nt * 100}cqw`,
    "--sa-ratio": Nt,
    "--sa-radius": `${lt}px`,
    "--sa-panel-radius": `${pt}px`,
    "--sa-duration": `${F}s`,
    "--sa-spring": H1,
    "--sa-autoplay": `${jt}s`,
    "--sa-bg": I.background,
    "--sa-panel": I.panel,
    "--sa-title": I.title,
    "--sa-text": I.text,
    "--sa-badge": I.badge,
    "--sa-badge-text": I.badgeText,
    "--sa-accent": I.accent,
    "--sa-accent-text": I.accentText,
    ...ul
  }, r = (S, A, U = "") => S.image ? /* @__PURE__ */ T.jsx("img", { className: `sa__img ${U}`, src: S.image, alt: S.alt || "", loading: A === Y ? "eager" : "lazy", draggable: !1 }) : /* @__PURE__ */ T.jsx("span", { className: `sa__img ${U}`, style: { background: S.art } });
  return /* @__PURE__ */ T.jsxs(
    "section",
    {
      ref: Mt,
      className: `sa ${dt ? "is-stacked" : ""} ${q === "left" ? "is-flipped" : ""} ${At}`.trim(),
      style: Zt,
      "aria-label": s,
      onPointerEnter: () => Bt(!0),
      onPointerLeave: () => Bt(!1),
      onFocus: () => Bt(!0),
      onBlur: (S) => !S.currentTarget.contains(S.relatedTarget) && Bt(!1),
      ...bt,
      children: [
        x && /* @__PURE__ */ T.jsx("h2", { className: "sa__heading", children: x }),
        /* @__PURE__ */ T.jsxs("div", { className: "sa__grid", children: [
          /* @__PURE__ */ T.jsx("ol", { ref: M, className: "sa__list", children: b.map((S, A) => {
            const U = A === G, j = `sa-${A}`;
            return /* @__PURE__ */ T.jsxs("li", { ref: (J) => R.current[A] = J, className: `sa__item ${U ? "is-open" : ""}`, children: [
              /* @__PURE__ */ T.jsx("h3", { className: "sa__h", children: /* @__PURE__ */ T.jsxs(
                "button",
                {
                  type: "button",
                  className: "sa__head",
                  "aria-expanded": U,
                  "aria-controls": `${j}-panel`,
                  id: `${j}-head`,
                  onClick: () => Et(A),
                  onKeyDown: (J) => Wt(J, A),
                  children: [
                    /* @__PURE__ */ T.jsx("span", { className: "sa__badge", children: S.number ?? A + 1 }),
                    /* @__PURE__ */ T.jsx("span", { className: "sa__title", children: S.title }),
                    /* @__PURE__ */ T.jsx("svg", { className: "sa__chev", viewBox: "0 0 20 20", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("path", { d: "m5 8 5 5 5-5" }) })
                  ]
                }
              ) }),
              /* @__PURE__ */ T.jsx("div", { className: "sa__panel", id: `${j}-panel`, role: "region", "aria-labelledby": `${j}-head`, inert: !U || void 0, children: /* @__PURE__ */ T.jsxs("div", { className: "sa__inner", children: [
                dt && /* @__PURE__ */ T.jsx("div", { className: "sa__inline-img", children: r(S, A) }),
                S.text && /* @__PURE__ */ T.jsx("p", { className: "sa__text", children: S.text }),
                S.cta && /* @__PURE__ */ T.jsxs("a", { className: "sa__cta", href: S.href || "#", target: S.newTab ? "_blank" : void 0, rel: S.newTab ? "noreferrer" : void 0, children: [
                  S.cta,
                  /* @__PURE__ */ T.jsx("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("path", { d: "M3 8h9m-4-4 4 4-4 4" }) })
                ] })
              ] }) }),
              U && V && /* @__PURE__ */ T.jsx("span", { className: "sa__progress", "aria-hidden": "true" }, `${G}`)
            ] }, A);
          }) }),
          !dt && /* @__PURE__ */ T.jsx("div", { className: "sa__media", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("div", { ref: X, className: "sa__frame", style: { translate: `0 ${Qt}px` }, children: b.map((S, A) => {
            const U = r(S, A), j = /* @__PURE__ */ T.jsx("span", { className: `sa__card ${A === G ? "is-active" : ""}`, children: U }, A);
            return S.href ? /* @__PURE__ */ T.jsx("a", { href: S.href, tabIndex: -1, className: "sa__card-link", onClick: (J) => A !== G && J.preventDefault(), children: j }, A) : j;
          }) }) })
        ] })
      ]
    }
  );
}
const gh = {
  indigo: {
    frame: "#0a0a30",
    panel: "linear-gradient(180deg, #1a1a6b 0%, #14144f 100%)",
    title: "#ffffff",
    description: "rgba(255, 255, 255, 0.52)",
    arrow: "#ffffff",
    edge: "rgba(255, 255, 255, 0.16)",
    art: "radial-gradient(130% 100% at 28% 4%, #8b7cff 0%, #5a44e6 34%, #3320b4 62%, #1b0f72 100%)",
    sheen: "conic-gradient(from 205deg at 38% 26%, #c9a3ff 0deg, #6ee7ff 70deg, #a78bfa 140deg, #ff9ad5 210deg, #7c5cff 285deg, #c9a3ff 360deg)",
    sheenBlend: "overlay",
    sheenOpacity: 0.5
  },
  porcelain: {
    frame: "#c2d1e3",
    panel: "linear-gradient(180deg, #f2f4f7 0%, #e8eaee 100%)",
    title: "#0d0f14",
    description: "#6a7280",
    arrow: "#0d0f14",
    edge: "rgba(255, 255, 255, 0.85)",
    art: "radial-gradient(120% 95% at 26% 0%, #ffab4d 0%, #f4442a 34%, #a01a5e 62%, #2f1d96 100%)",
    sheen: "conic-gradient(from 150deg at 60% 24%, #fff0c2 0deg, #ffb27a 70deg, #ff8fb8 140deg, #b9c8ff 215deg, #ffd9a3 290deg, #fff0c2 360deg)",
    sheenBlend: "soft-light",
    sheenOpacity: 0.55
  },
  onyx: {
    frame: "#07090b",
    panel: "linear-gradient(180deg, #141d24 0%, #0d1418 100%)",
    title: "#ffffff",
    description: "rgba(255, 255, 255, 0.55)",
    arrow: "#ffffff",
    edge: "rgba(255, 255, 255, 0.14)",
    art: "radial-gradient(120% 95% at 52% 0%, #eaf3fb 0%, #a8c7e0 24%, #55809f 46%, #233e54 68%, #05090c 100%)",
    sheen: "conic-gradient(from 235deg at 44% 20%, #eaf6ff 0deg, #a8d4ff 80deg, #e8d9ff 155deg, #bfe8ff 230deg, #ffffff 300deg, #eaf6ff 360deg)",
    sheenBlend: "overlay",
    sheenOpacity: 0.45
  }
}, ru = 300;
function Nh(b, O) {
  return `M0 0${R1(ru * b, 0, O)}H${ru}`;
}
function q1(b, O, N) {
  return `${Nh(O, N)}V${Il(b)}H0Z`;
}
const B1 = typeof window > "u" ? at.useEffect : at.useLayoutEffect;
function Y1() {
  return /* @__PURE__ */ T.jsx("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ T.jsx(
    "path",
    {
      d: "M7.5 16.5 16.5 7.5M9 7.5h7.5V15",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }
  ) });
}
function w1({
  number: b,
  title: O,
  description: N,
  /* Artwork behind the folder. `image` wins; otherwise the preset gradient. */
  image: s,
  /* Transparent cut-out that rises from behind the folder on hover. Pairs with
     `art`/the preset gradient as the backdrop, not with `image`. */
  subject: x,
  subjectTop: k = 0.04,
  subjectHeight: nt = 0.5,
  subjectDrop: Nt = 0.46,
  subjectScale: lt = 0.88,
  /* Which part of the image stays in frame; the folder covers the bottom, so
     biasing upward brings more of the subject into the closed state. */
  imagePosition: pt = "center",
  art: q,
  /* Rendered as <a> when href is set, <button> when onClick is, else <div>. */
  href: p,
  onClick: Y,
  /* Look */
  preset: Ut = "indigo",
  theme: jt,
  /* Geometry */
  aspect: Ot = 0.72,
  tab: F = 0.62,
  notch: Tt = 30,
  radius: At = 28,
  frameWidth: ul = 7,
  /* Motion — fractions of the card height that the folder sits down by. */
  closedOffset: bt = 0.2,
  openOffset: I = 0.54,
  duration: ut = 760,
  /* 0 = no overshoot, 0.75 = default, 1 = very bouncy. */
  bounce: G = 0.75,
  /* Leave unset to keep the spring; pass any easing to override it. */
  easing: W,
  spring: Pt = !0,
  /* Extras */
  glass: Bt = !0,
  grain: dt = !0,
  edge: Ct = !0,
  icon: Qt,
  className: ht = "",
  style: Mt,
  ...M
}) {
  const R = { ...gh[Ut] || gh.indigo, ...jt }, { facePath: X, edgePath: w, vbH: V } = at.useMemo(() => {
    const K = ru / Ot;
    return {
      vbH: K,
      facePath: q1(K, F, Tt),
      edgePath: Nh(F, Tt)
    };
  }, [Ot, F, Tt]), Et = at.useMemo(() => U1(X, ru, V), [X, V]), Wt = at.useMemo(() => Qi(G), [G]), Zt = at.useRef(null), r = at.useRef(null), S = at.useRef(null), [A, U] = at.useState(I);
  B1(() => {
    const K = Zt.current, C = r.current, z = S.current;
    if (!K || !C) return;
    const Q = () => {
      const vt = K.clientHeight;
      if (!vt) return;
      const st = C.offsetHeight, it = z ? z.offsetHeight : 0, gt = (vt - it - st - st * 0.32) / vt;
      U(Math.max(bt, Math.min(I, gt)));
    };
    if (Q(), typeof ResizeObserver > "u") return;
    const mt = new ResizeObserver(Q);
    return mt.observe(K), mt.observe(C), z && mt.observe(z), () => mt.disconnect();
  }, [I, bt]);
  const j = p ? "a" : Y ? "button" : "div", J = {
    "--cf-frame": R.frame,
    "--cf-panel": R.panel,
    "--cf-title": R.title,
    "--cf-desc": R.description,
    "--cf-arrow": R.arrow,
    "--cf-edge": R.edge,
    "--cf-aspect": Ot,
    "--cf-radius": `${At}px`,
    "--cf-frame-w": `${ul}px`,
    "--cf-closed": `${bt * 100}%`,
    "--cf-open": `${A * 100}%`,
    "--cf-dur": `${ut}ms`,
    ...x ? {
      "--cf-subject": `url("${x}")`,
      "--cf-subject-top": `${k * 100}%`,
      "--cf-subject-height": `${nt * 100}%`,
      "--cf-subject-drop": `${Nt * 100}%`,
      "--cf-subject-scale": lt
    } : null,
    "--cf-sheen": R.sheen || "none",
    "--cf-sheen-blend": R.sheenBlend || "screen",
    "--cf-sheen-opacity": R.sheenOpacity ?? 0.5,
    ...Pt ? { "--cf-spring": Wt } : null,
    ...W ? { "--cf-ease": W, "--cf-slide-ease": W } : null,
    ...Mt
  };
  return /* @__PURE__ */ T.jsx(
    j,
    {
      className: `cf-card${ht ? ` ${ht}` : ""}`,
      style: J,
      href: p,
      onClick: Y,
      type: j === "button" ? "button" : void 0,
      ...M,
      children: /* @__PURE__ */ T.jsxs("span", { className: "cf-inner", ref: Zt, children: [
        /* @__PURE__ */ T.jsx(
          "span",
          {
            className: "cf-art",
            style: {
              background: s ? `url("${s}") ${pt}/cover no-repeat` : q || R.art
            }
          }
        ),
        Bt && R.sheen && /* @__PURE__ */ T.jsx("span", { className: "cf-glass", "aria-hidden": "true" }),
        x && /* @__PURE__ */ T.jsx("span", { className: "cf-subject", "aria-hidden": "true" }),
        dt && /* @__PURE__ */ T.jsx("span", { className: "cf-grain", "aria-hidden": "true" }),
        /* @__PURE__ */ T.jsxs("span", { className: "cf-panel", children: [
          /* @__PURE__ */ T.jsx(
            "span",
            {
              className: "cf-face",
              style: { maskImage: Et, WebkitMaskImage: Et },
              "aria-hidden": "true"
            }
          ),
          Ct && /* @__PURE__ */ T.jsx(
            "svg",
            {
              className: "cf-edge",
              viewBox: `0 0 ${ru} ${Il(V)}`,
              preserveAspectRatio: "none",
              "aria-hidden": "true",
              focusable: "false",
              children: /* @__PURE__ */ T.jsx("path", { d: w, vectorEffect: "non-scaling-stroke" })
            }
          ),
          /* @__PURE__ */ T.jsxs("span", { className: "cf-head", ref: r, children: [
            /* @__PURE__ */ T.jsx("span", { className: "cf-number", children: b }),
            /* @__PURE__ */ T.jsx("span", { className: "cf-icon", children: Qt ?? /* @__PURE__ */ T.jsx(Y1, {}) })
          ] })
        ] }),
        /* @__PURE__ */ T.jsxs("span", { className: "cf-text", ref: S, children: [
          O && /* @__PURE__ */ T.jsx("span", { className: "cf-title", children: O }),
          N && /* @__PURE__ */ T.jsx("span", { className: "cf-desc", children: N })
        ] })
      ] })
    }
  );
}
const yh = {
  paper: {
    background: "#ffffff",
    surface: "#e5e5e5",
    title: "#111111",
    text: "#5f5f63"
  },
  ink: {
    background: "#0c0c0e",
    surface: "#1e1f23",
    title: "#f4f4f5",
    text: "#a0a2a9"
  },
  linen: {
    background: "#f7f2ea",
    surface: "#e9dfcf",
    title: "#2b2016",
    text: "#7a6955"
  }
};
function G1({
  items: b = [],
  preset: O = "paper",
  theme: N,
  startIndex: s = 0,
  onChange: x,
  /* --- layout ------------------------------------------------------------ */
  /* Width over height of the whole component. */
  aspect: k = 2.1,
  /* Share of the width the tab column takes. */
  tabsWidth: nt = 0.25,
  /* Space above the first tab, fraction of the height. */
  tabsTop: Nt = 0.07,
  /* Frame thickness around the picture, and the corner radii, px. */
  frame: lt = 8,
  radius: pt = 24,
  tabRadius: q = 12,
  /* --- motion ------------------------------------------------------------ */
  /* Seconds for the tab to open and the picture to change. */
  speed: p = 0.45,
  className: Y = "",
  style: Ut,
  ...jt
}) {
  const Ot = { ...yh[O] || yh.paper, ...N }, [F, Tt] = at.useState(Math.min(s, Math.max(0, b.length - 1))), At = (bt) => {
    bt !== F && (Tt(bt), x == null || x(bt));
  }, ul = {
    "--ht-aspect": k,
    "--ht-tabs": `${nt * 100}%`,
    "--ht-top": `${Nt * 100}%`,
    "--ht-frame": `${lt}px`,
    "--ht-radius": `${pt}px`,
    "--ht-tab-radius": `${q}px`,
    "--ht-speed": `${p}s`,
    "--ht-bg": Ot.background,
    "--ht-surface": Ot.surface,
    "--ht-title": Ot.title,
    "--ht-text": Ot.text,
    ...Ut
  };
  return /* @__PURE__ */ T.jsx("div", { className: `ht ${Y}`.trim(), style: ul, ...jt, children: /* @__PURE__ */ T.jsxs("div", { className: "ht__grid", children: [
    /* @__PURE__ */ T.jsx("div", { className: "ht__tabs", role: "tablist", "aria-orientation": "vertical", children: b.map((bt, I) => /* @__PURE__ */ T.jsxs(
      "button",
      {
        type: "button",
        role: "tab",
        id: `ht-tab-${I}`,
        "aria-selected": I === F,
        className: `ht__tab${I === F ? " is-active" : ""}`,
        onPointerEnter: (ut) => ut.pointerType === "mouse" && At(I),
        onFocus: () => At(I),
        onClick: () => At(I),
        children: [
          /* @__PURE__ */ T.jsx("span", { className: "ht__title", children: bt.title }),
          bt.description && /* @__PURE__ */ T.jsx("span", { className: "ht__more", children: /* @__PURE__ */ T.jsx("span", { className: "ht__text", children: bt.description }) })
        ]
      },
      I
    )) }),
    /* @__PURE__ */ T.jsx("div", { className: "ht__panel", role: "tabpanel", "aria-labelledby": `ht-tab-${F}`, children: /* @__PURE__ */ T.jsx("div", { className: "ht__pictures", children: b.map((bt, I) => /* @__PURE__ */ T.jsx(
      "img",
      {
        src: bt.image,
        alt: I === F ? bt.alt ?? bt.title ?? "" : "",
        "aria-hidden": I !== F,
        className: I === F ? "is-active" : "",
        decoding: "async",
        draggable: !1
      },
      I
    )) }) })
  ] }) });
}
const nl = (b) => /* @__PURE__ */ T.jsx("path", { d: b }), X1 = {
  shield: nl("M12 3.2 19 6v5.4c0 4-2.8 7.3-7 8.4-4.2-1.1-7-4.4-7-8.4V6l7-2.8Z"),
  chat: /* @__PURE__ */ T.jsx(T.Fragment, { children: nl("M20 12.2c0 3.5-3.4 6.3-7.6 6.3-.9 0-1.8-.1-2.6-.4L5 19.5l1.2-3.1C4.8 15.3 4 13.8 4 12.2 4 8.7 7.4 5.9 11.6 5.9S20 8.7 20 12.2Z") }),
  bag: /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
    nl("M4.8 8h14.4l-1 10.2a1.8 1.8 0 0 1-1.8 1.6H7.6a1.8 1.8 0 0 1-1.8-1.6L4.8 8Z"),
    nl("M9.2 11.4a2.8 2.8 0 0 0 5.6 0")
  ] }),
  tag: /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
    nl("M4 9.6a1.6 1.6 0 0 1 1.6-1.6h8.1c.5 0 1 .2 1.3.6l2.9 3.4-2.9 3.4a1.7 1.7 0 0 1-1.3.6H5.6A1.6 1.6 0 0 1 4 14.4V9.6Z"),
    nl("M11.9 8v8")
  ] }),
  sparkle: /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
    nl("M13.4 3.6 15 8.2l4.6 1.6-4.6 1.6-1.6 4.6-1.6-4.6-4.6-1.6 4.6-1.6 1.6-4.6Z"),
    nl("M7 15.2l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z")
  ] }),
  compass: /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
    nl("M12 3.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4Z"),
    nl("M15.3 8.7 13.6 13.6 8.7 15.3l1.7-4.9 4.9-1.7Z")
  ] }),
  layers: /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
    nl("M12 3.6 20.4 8 12 12.4 3.6 8 12 3.6Z"),
    nl("M4.6 12.2 12 16.2l7.4-4"),
    nl("M4.6 16.1 12 20.1l7.4-4")
  ] }),
  orbit: /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
    nl("M12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z"),
    nl("M17.7 7.4c2.3 1.6 3.5 3.4 2.9 4.7-.9 2.1-6 2.3-11.3.5S.9 7 1.8 4.9")
  ] }),
  play: nl("M9.4 7.3 16.6 12l-7.2 4.7V7.3Z"),
  arrow: /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
    nl("M4.8 12h14"),
    nl("M13.4 6.8 18.6 12l-5.2 5.2")
  ] })
};
function Q1({ name: b }) {
  if (!b) return null;
  if (typeof b != "string") return b;
  const O = X1[b];
  return O ? /* @__PURE__ */ T.jsx("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ T.jsx(
    "g",
    {
      stroke: "currentColor",
      strokeWidth: "1.7",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: O
    }
  ) }) : null;
}
const bh = {
  void: {
    background: "#000000",
    dim: "linear-gradient(180deg, rgba(3, 5, 10, 0.58) 0%, rgba(3, 5, 10, 0.72) 100%)",
    scrim: "linear-gradient(180deg, rgba(4, 6, 12, 0) 34%, rgba(4, 6, 12, 0.58) 68%, rgba(4, 6, 12, 0.9) 100%)",
    title: "#ffffff",
    body: "rgba(255, 255, 255, 0.86)",
    number: "#ffffff",
    numberDim: "rgba(255, 255, 255, 0.72)",
    icon: "rgba(255, 255, 255, 0.92)"
  },
  slate: {
    background: "#0e1117",
    dim: "linear-gradient(180deg, rgba(10, 14, 22, 0.5) 0%, rgba(10, 14, 22, 0.68) 100%)",
    scrim: "linear-gradient(180deg, rgba(8, 11, 18, 0) 34%, rgba(8, 11, 18, 0.56) 68%, rgba(8, 11, 18, 0.88) 100%)",
    title: "#ffffff",
    body: "rgba(255, 255, 255, 0.82)",
    number: "#ffffff",
    numberDim: "rgba(255, 255, 255, 0.66)",
    icon: "rgba(255, 255, 255, 0.9)"
  },
  paper: {
    /* The images stay dark, so the type over them stays white; only the
       backdrop behind the rail turns over. */
    background: "#f2f3f6",
    dim: "linear-gradient(180deg, rgba(18, 22, 30, 0.44) 0%, rgba(18, 22, 30, 0.62) 100%)",
    scrim: "linear-gradient(180deg, rgba(10, 12, 18, 0) 34%, rgba(10, 12, 18, 0.54) 68%, rgba(10, 12, 18, 0.86) 100%)",
    title: "#ffffff",
    body: "rgba(255, 255, 255, 0.84)",
    number: "#ffffff",
    numberDim: "rgba(255, 255, 255, 0.7)",
    icon: "rgba(255, 255, 255, 0.92)"
  },
  ember: {
    background: "radial-gradient(120% 120% at 50% 0%, #241410 0%, #120a09 58%, #060404 100%)",
    dim: "linear-gradient(180deg, rgba(14, 6, 4, 0.54) 0%, rgba(14, 6, 4, 0.74) 100%)",
    scrim: "linear-gradient(180deg, rgba(12, 5, 4, 0) 34%, rgba(12, 5, 4, 0.58) 68%, rgba(12, 5, 4, 0.92) 100%)",
    title: "#ffffff",
    body: "rgba(255, 240, 232, 0.84)",
    number: "#ffffff",
    numberDim: "rgba(255, 238, 228, 0.7)",
    icon: "rgba(255, 242, 235, 0.92)"
  }
}, Z1 = (b, O, N) => b < O ? O : b > N ? N : b;
function V1({
  items: b = [],
  preset: O = "void",
  theme: N,
  /* --- the rail. Lengths are fractions of the rail's own width, so the
     proportions hold at any size. ----------------------------------------- */
  /* Height over width, for the rail as a whole. */
  height: s = 0.67,
  /* Visible width of a collapsed card. */
  railWidth: x = 0.094,
  gap: k = 0.022,
  padding: nt = 0.024,
  iconSize: Nt = 0.028,
  cornerRadius: lt = 0.024,
  /* --- motion ----------------------------------------------------------- */
  /* Seconds for a card to open. */
  speed: pt = 0.72,
  /* 0 is a critically damped glide; 1 overshoots about a quarter. Kept low —
     the reference glides, it does not spring. */
  bounce: q = 0.16,
  /* Scale a collapsed card's image sits at, so opening also unzooms it. */
  zoom: p = 1.12,
  /* How far the image lags behind the reveal, 0 to 1. The sliver then shows a
     slice from nearer the middle of the picture, and opening slides the rest
     of it into place. */
  parallax: Y = 0.4,
  /* Fraction of the open duration the caption waits before arriving, so the
     type lands in a card that has already made room for it. */
  captionDelay: Ut = 0.3,
  /* --- behaviour --------------------------------------------------------- */
  startIndex: jt = 0,
  /* Off by default: the rail holds whichever card you left it on, which is
     calmer than snapping back the moment the pointer strays. */
  revertOnLeave: Ot = !1,
  showNumbers: F = !0,
  onChange: Tt,
  className: At = "",
  style: ul,
  ...bt
}) {
  const I = at.useMemo(() => b.filter(Boolean), [b]), ut = I.length, G = Z1(jt, 0, Math.max(0, ut - 1)), [W, Pt] = at.useState(G), Bt = at.useRef(G), dt = at.useMemo(() => Qi(q), [q]), Ct = (w) => {
    w !== W && (Pt(w), Bt.current = w, Tt == null || Tt(w, I[w]));
  }, Qt = x * 100, ht = k * 100, Mt = Math.max(Qt, 100 - (ut - 1) * (Qt + ht)), M = ((x - Nt) / 2 - nt) * 100, R = { ...bh[O] || bh.void, ...N }, X = {
    "--exp-bg": R.background,
    "--exp-dim": R.dim,
    "--exp-scrim": R.scrim,
    "--exp-title": R.title,
    "--exp-body-color": R.body,
    "--exp-number": R.number,
    "--exp-number-dim": R.numberDim,
    "--exp-icon-color": R.icon,
    "--exp-ratio": `${1 / s}`,
    "--exp-card-w": `${Mt}cqw`,
    "--exp-pad": `${nt * 100}cqw`,
    "--exp-icon-size": `${Nt * 100}cqw`,
    "--exp-corner": `${lt * 100}cqw`,
    "--exp-nudge": `${M}cqw`,
    "--exp-speed": `${pt}s`,
    "--exp-ease": dt,
    "--exp-zoom": p,
    "--exp-parallax": Y,
    "--exp-caption-delay": `${pt * Ut}s`,
    ...ul
  };
  return ut ? /* @__PURE__ */ T.jsx(
    "div",
    {
      className: `exp${At ? ` ${At}` : ""}`,
      style: X,
      role: "group",
      "aria-label": "Expanding card rail",
      onPointerLeave: Ot ? () => Ct(G) : void 0,
      ...bt,
      children: /* @__PURE__ */ T.jsx("div", { className: "exp-rail", children: I.map((w, V) => {
        const Et = V === W, Wt = V * (Qt + ht) + (V > W ? Mt - Qt : 0), Zt = w.href ? "a" : "div";
        return /* @__PURE__ */ T.jsxs(
          Zt,
          {
            className: `exp-card${Et ? " is-open" : ""}`,
            href: w.href,
            style: {
              "--x": `${Wt}cqw`,
              "--vis": Et ? `${Mt}cqw` : `${Qt}cqw`,
              zIndex: Et ? ut : V
            },
            tabIndex: w.href ? void 0 : 0,
            role: w.href ? void 0 : "button",
            "aria-expanded": Et,
            "aria-label": w.title ?? `Card ${V + 1}`,
            onPointerEnter: () => Ct(V),
            onFocus: () => Ct(V),
            onClick: (r) => {
              w.href && Bt.current !== V && (r.preventDefault(), Ct(V));
            },
            onKeyDown: (r) => {
              w.href || (r.key === "Enter" || r.key === " ") && (r.preventDefault(), Ct(V));
            },
            children: [
              w.image ? /* @__PURE__ */ T.jsx(
                "img",
                {
                  className: "exp-media",
                  src: w.image,
                  alt: w.alt ?? "",
                  draggable: "false",
                  decoding: "async",
                  loading: Et ? "eager" : "lazy"
                }
              ) : (
                /* Stands in until real artwork arrives, and unzooms on open
                   exactly as an image would. */
                /* @__PURE__ */ T.jsx("span", { className: "exp-media", style: { background: w.art } })
              ),
              /* @__PURE__ */ T.jsx("span", { className: "exp-scrim", "aria-hidden": "true" }),
              /* @__PURE__ */ T.jsx("span", { className: "exp-veil", "aria-hidden": "true" }),
              F && /* @__PURE__ */ T.jsx("span", { className: "exp-num", "aria-hidden": "true", children: String(w.number ?? V + 1).padStart(2, "0") }),
              /* @__PURE__ */ T.jsxs("span", { className: "exp-caption", children: [
                w.description && /* @__PURE__ */ T.jsx("span", { className: "exp-body", children: w.description }),
                (w.icon || w.title) && /* @__PURE__ */ T.jsxs("span", { className: "exp-foot", children: [
                  w.icon && /* @__PURE__ */ T.jsx("span", { className: "exp-mark", children: /* @__PURE__ */ T.jsx(Q1, { name: w.icon }) }),
                  w.title && /* @__PURE__ */ T.jsx("span", { className: "exp-title", children: w.title })
                ] })
              ] })
            ]
          },
          w.id ?? V
        );
      }) })
    }
  ) : null;
}
const L1 = `#version 300 es
precision highp float;
#include "spectral"
#include "noise"

// A full disc of flowing spectral liquid. Same diffraction integral as a
// grating ring, but the optical path difference comes from a scalar field
// flowing across the whole circle instead of from a light orbiting a thin band.
//
// The visible result is meant to be an annulus: a smaller opaque cap sits on top
// in the DOM, so only the outer margin of this disc shows. That's the point of
// the approach -- the ring is a *window onto a 2D field* rather than a 1D
// function of angle, so colour varies along the band and across it at once, and
// the pattern keeps evolving instead of rotating rigidly.
//
// uMode selects which field drives it. They're deliberately different in
// character rather than variations on one idea, since the whole point is to see
// which structure reads closest to the reference. This build pins uMode to
// MODE_CAUSTIC (see liquid-disc.ts) but all eight remain compiled in below,
// unmodified, since they live in the same shader file upstream.

uniform vec2  uResolution;
uniform float uTime;
uniform float uRadius;      // disc radius, px
uniform float uSpeed;       // flow rate
uniform float uScale;       // field features per disc radius
uniform float uWarp;        // field character -- meaning depends on the mode
uniform float uDispersion;  // spectral orders across the field's range
uniform float uSharpness;
uniform float uHotspot;
uniform float uGlow;        // outward bleed beyond the disc edge, in radii
uniform float uIntensity;
uniform int   uMode;

out vec4 fragColor;

const int MODE_WARP    = 0;
const int MODE_SWIRL   = 1;
const int MODE_CAUSTIC = 2;
const int MODE_MARBLE  = 3;
const int MODE_RIDGE   = 4;
const int MODE_CELLS   = 5;
const int MODE_SWEEP   = 6;
const int MODE_RIPPLE  = 7;

// --- fields -----------------------------------------------------------------
// Each returns roughly 0..1. main() recentres and scales that into orders.

// Noise displacing a lookup into more noise. Two rounds is what turns smooth
// blobs into folded, marbled structure. Each layer drifts on its own vector so
// nothing pulses in lockstep.
float fieldWarp(vec2 q, float t, float warp) {
  vec2 w1 = vec2(fbm(q + vec2(0.0, t * 0.35)),
                 fbm(q + vec2(5.2, 1.3) - vec2(t * 0.28, 0.0)));
  vec2 w2 = vec2(fbm(q + warp * w1 + vec2(1.7, 9.2) + vec2(0.0, t * 0.22)),
                 fbm(q + warp * w1 + vec2(8.3, 2.8) - vec2(t * 0.19, 0.0)));
  return fbm(q + warp * w2);
}

// Rotation that increases with radius, so the field shears into a vortex. The
// twist winds up over time rather than just spinning.
float fieldSwirl(vec2 q, float t, float warp) {
  float twist = length(q) * warp * 1.6 - t * 0.5;
  return fbm(rot(twist) * q + vec2(0.0, t * 0.12));
}

// Interfering circular wavefronts from a handful of drifting sources -- the
// pool-floor caustic look. Sharp, high-contrast, lots of fine structure.
float fieldCaustic(vec2 q, float t, float warp) {
  float v = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 src = vec2(cos(t * 0.31 + fi * 2.4), sin(t * 0.37 + fi * 1.7)) * (1.2 + warp * 0.4);
    v += sin(length(q - src) * (3.0 + fi * 0.8) - t * 1.3);
  }
  return v / 10.0 + 0.5;
}

// Classic marbling: a smooth ramp whose phase is pushed around by noise. Gives
// long continuous veins rather than blobs.
float fieldMarble(vec2 q, float t, float warp) {
  float n = fbm(q * 0.9 + vec2(0.0, t * 0.15));
  return 0.5 + 0.5 * sin(q.x * 1.8 + q.y * 1.1 + n * warp * 4.0 + t * 0.6);
}

// Ridged multifractal: folding the noise about its midpoint turns smooth hills
// into creases, which gives filament-like highlights.
float fieldRidge(vec2 q, float t, float warp) {
  float v = 0.0, amp = 0.5;
  vec2 p = q + vec2(t * 0.09, -t * 0.06);
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
    v += amp * pow(n, 1.0 + warp);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

// Voronoi F1: cellular structure with hard-edged boundaries, each cell centre
// orbiting its own little circle.
float fieldCells(vec2 q, float t, float warp) {
  vec2 n = floor(q), f = fract(q);
  float best = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash21(n + g), hash21(n + g + 31.7));
      o = 0.5 + 0.5 * sin(t * 0.8 + TAU * o) * clamp(warp, 0.0, 1.0);
      best = min(best, length(g + o - f));
    }
  }
  return clamp(best, 0.0, 1.0);
}

// A conic sweep, like a diffraction-grating ring but perturbed by noise so it
// wobbles and drifts instead of rotating rigidly. Closest of the modes to a
// plain angular sweep.
float fieldSweep(vec2 q, float t, float warp) {
  float a = atan(q.y, q.x);
  return 0.5 + 0.5 * cos(a - t * 0.8 + (fbm(q * 0.8 + vec2(0.0, t * 0.1)) - 0.5) * warp * 5.0);
}

// Concentric wavefronts from a single wandering source, softened by noise.
float fieldRipple(vec2 q, float t, float warp) {
  vec2 c = vec2(cos(t * 0.4), sin(t * 0.53)) * 0.7;
  float rr = length(q - c);
  return 0.5 + 0.5 * sin(rr * (2.0 + warp * 2.5) - t * 1.5 + (fbm(q) - 0.5) * 2.0);
}

float field(vec2 q, float t, float warp) {
  if (uMode == MODE_SWIRL)   return fieldSwirl(q, t, warp);
  if (uMode == MODE_CAUSTIC) return fieldCaustic(q, t, warp);
  if (uMode == MODE_MARBLE)  return fieldMarble(q, t, warp);
  if (uMode == MODE_RIDGE)   return fieldRidge(q, t, warp);
  if (uMode == MODE_CELLS)   return fieldCells(q, t, warp);
  if (uMode == MODE_SWEEP)   return fieldSweep(q, t, warp);
  if (uMode == MODE_RIPPLE)  return fieldRipple(q, t, warp);
  return fieldWarp(q, t, warp);
}

void main() {
  vec2 p = gl_FragCoord.xy - 0.5 * uResolution;
  float r = length(p);
  float rn = r / uRadius;              // 1.0 at the disc edge

  vec2 q = p / uRadius * uScale;
  float t = uTime * uSpeed;

  // Three field evaluations: the value plus a forward difference for the
  // gradient. Central differences would cost two more for no visible gain, and
  // the expensive modes (caustic, cells) are evaluated per sample.
  float eps = 0.04;
  float f0 = field(q, t, uWarp);
  float fx = field(q + vec2(eps, 0.0), t, uWarp);
  float fy = field(q + vec2(0.0, eps), t, uWarp);

  // Recentre so the disc doesn't sit permanently on one side of the spectrum,
  // then scale into orders.
  float d = ORDER * uDispersion * (f0 - 0.5) * 2.0 + 0.55;
  vec3 spec = diffraction(d, uSharpness);

  // The gradient stands in for a surface normal: ridges catch the light the way
  // a raised fold would.
  vec2 grad = vec2(fx - f0, fy - f0) / eps;
  vec2 lightDir = vec2(cos(t * 0.6), sin(t * 0.6));
  float ndl = clamp(dot(normalize(grad + 1e-5), lightDir) * length(grad) * 1.4, -1.0, 1.0);
  float hot = pow(max(ndl, 0.0), uHotspot);

  vec3 col = spec * (0.75 + 0.5 * max(ndl, 0.0)) + vec3(hot) * 0.9;
  col *= uIntensity;

  // Disc mask, antialiased against roughly one device pixel, plus a soft bleed
  // outside the edge so the disc glows onto its surroundings rather than
  // ending flat.
  float aa = 1.5 / uRadius;
  float disc = 1.0 - smoothstep(1.0 - aa, 1.0, rn);
  float bleed = exp(-max(rn - 1.0, 0.0) / max(uGlow, 1e-3));
  float shape = max(disc, bleed * 0.55);

  vec3 outCol = col * shape;
  float alpha = clamp(shape, 0.0, 1.0);

  // Ramp to true zero before the canvas ends, or the bleed clips into a visible
  // rectangle against the background.
  float edge = 1.0 - smoothstep(0.78, 1.0, r / (0.5 * min(uResolution.x, uResolution.y)));
  outCol *= edge;
  alpha *= edge;

  fragColor = vec4(outCol, alpha);
}
`, K1 = `#version 300 es

// Fullscreen triangle: no attribute buffers needed, just gl_VertexID.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`, J1 = `// Shared spectral core. Injected into each fragment shader in place of
// \`#include "spectral"\` -- GLSL has no include mechanism of its own, so the
// substitution happens in shader-surface.ts before compiling.

const float TAU = 6.28318530718;
const float PI  = 3.14159265359;

// Path-difference change that advances the hue through one full cycle. It's the
// beat period between the ends of the visible band: 1/0.62 - 1/1.42 ~= 0.91, so
// one order is ~1/0.91. Expressing \`d\` in these units lets dispersion be stated
// as "spectral orders" rather than an arbitrary gain.
const float ORDER = 1.1;

// --- Spectral Zucconi 6 -----------------------------------------------------
// Alan Zucconi's least-squares fit of the CIE visible spectrum. Takes a
// normalised wavelength in [0,1] (violet -> red) and returns linear RGB.
// Much cheaper than a real CIE table and close enough to be indistinguishable
// once it's been integrated over and bloomed.
vec3 bump3y(vec3 x, vec3 yoffset) {
  return clamp((1.0 - x * x) - yoffset, 0.0, 1.0);
}

vec3 spectralZucconi6(float x) {
  const vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
  const vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
  const vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
  const vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
  const vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
  const vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
  return bump3y(c1 * (x - x1), y1) + bump3y(c2 * (x - x2), y2);
}

// --- Diffraction ------------------------------------------------------------
// Given an optical path difference \`d\`, integrate the interference term over the
// visible band. Where \`d\` is small every wavelength constructively interferes
// and you get white; as \`d\` grows the wavelengths fall out of step at different
// rates and split into repeating spectral orders. This integral is what
// separates the effect from a plain hue-rotation rainbow.
//
// Three things this has to get right, all of which produce a grey or silver
// ring when missed:
//
//  1. The white point. Summing spectralZucconi6 across the band does NOT give
//     neutral white -- the fit is red/green heavy, so a scalar divisor leaves a
//     yellow cast on every pixel. Accumulate the weights and normalise
//     per-channel so full constructive interference lands on true white.
//
//  2. The DC floor. \`0.5 + 0.5*cos(...)\` has a mean of 0.5, so half the signal
//     is unmodulated broadband light diluting the colour. Raising the term to a
//     power narrows the constructive peaks, which matches the physics too: a
//     grating with many grooves has sharp orders (the N-slit interference
//     function), not soft cosine lobes.
//
//  3. Energy conservation. Brightness and saturation are anti-correlated by
//     construction: at d = 0 every wavelength is in phase, so the pixel is both
//     maximally bright AND white, while a saturated pixel has most of its
//     wavelengths destructive and is therefore dim. Left alone, the bright parts
//     are exactly the white parts and the colour is too dark to see. A real
//     grating redistributes the light it takes from the destructive wavelengths
//     into the constructive ones; dividing by the mean interference restores
//     that, holding brightness flat and letting chroma carry the variation.
//
vec3 diffraction(float d, float sharpness) {
  const int SAMPLES = 32;
  vec3 col = vec3(0.0);
  vec3 white = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float f = (float(i) + 0.5) / float(SAMPLES);  // 0 = violet, 1 = red
    float lambda = mix(0.62, 1.42, f);            // relative to 550nm
    vec3 weight = spectralZucconi6(f);
    float interference = pow(0.5 + 0.5 * cos(TAU * d / lambda), sharpness);
    col += interference * weight;
    white += weight;
    total += interference;
  }
  float mean = total / float(SAMPLES);
  vec3 c = (col / max(white, vec3(1e-4))) / max(mean, 0.12);

  // The energy term is an unbounded gain -- where most wavelengths land
  // destructive the mean gets tiny and the boost runs into the tens. Anything
  // past 1.0 clips per channel, and clipped r/g/b all pin to 1.0 together, which
  // is white: the most saturated pixels blow out to the least saturated colour.
  // Compress against the peak channel, which scales all three equally and so
  // preserves hue while bounding the result. Blowing out is the hotspot's job.
  float peak = max(max(c.r, c.g), c.b);
  return c * (1.5 / (1.0 + peak));
}
`, $1 = `// Shared noise chunk. Injected in place of \`#include "noise"\`.
//
// Hash-based value noise rather than a gradient/simplex implementation: it's a
// few instructions, has no lookup tables, and the warping it usually feeds hides
// the axis-aligned character that would otherwise give value noise away.

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);  // smoothstep interpolation
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float e = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, e, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p *= 2.03;   // slightly off 2.0 so octaves don't align into a grid
    amp *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Fades a repeating angular feature out as it approaches the Nyquist limit.
// \`cycles\` is repeats per full turn, \`r\` the radius in pixels. Past ~PI radians
// of phase per pixel the detail stops resolving and turns into moire, which any
// downstream averaging then washes to grey.
float resolvable(float cycles, float r) {
  return 1.0 - smoothstep(1.0, PI, cycles / max(r, 1.0));
}
`, k1 = {
  spectral: J1,
  noise: $1
};
function F1(b) {
  return b.replace(/#include "([a-z]+)"/g, (O, N) => {
    const s = k1[N];
    if (!s) throw new Error(`Unknown shader chunk "${N}" in ${O}`);
    return s;
  });
}
function Sh(b, O, N) {
  const s = b.createShader(O);
  if (!s) throw new Error("Failed to create shader");
  if (b.shaderSource(s, N), b.compileShader(s), !b.getShaderParameter(s, b.COMPILE_STATUS)) {
    const x = b.getShaderInfoLog(s);
    throw b.deleteShader(s), new Error(`Shader compile failed:
${x}`);
  }
  return s;
}
function W1(b, O, N) {
  const s = b.createProgram();
  if (!s) throw new Error("Failed to create program");
  const x = Sh(b, b.VERTEX_SHADER, O), k = Sh(b, b.FRAGMENT_SHADER, N);
  if (b.attachShader(s, x), b.attachShader(s, k), b.linkProgram(s), b.deleteShader(x), b.deleteShader(k), !b.getProgramParameter(s, b.LINK_STATUS)) {
    const nt = b.getProgramInfoLog(s);
    throw b.deleteProgram(s), new Error(`Program link failed:
${nt}`);
  }
  return s;
}
class I1 {
  constructor(O, N, s = 2) {
    this.canvas = O, this.maxDpr = s, this.locations = /* @__PURE__ */ new Map(), this.frame = 0, this.startTime = performance.now(), this.elapsed = 0, this.running = !1, this.disposed = !1, this.onMotionPreference = () => {
      this.reducedMotion.matches ? (this.stop(), this.render(this.elapsed)) : this.start();
    }, this.tick = () => {
      this.disposed || (this.elapsed = (performance.now() - this.startTime) / 1e3, this.render(this.elapsed), this.frame = requestAnimationFrame(this.tick));
    };
    const x = O.getContext("webgl2", {
      alpha: !0,
      antialias: !1,
      // shader edges are already analytically soft
      premultipliedAlpha: !0,
      powerPreference: "low-power"
    });
    if (!x) throw new Error("WebGL2 is not available");
    this.gl = x, this.program = W1(x, K1, F1(N)), x.enable(x.BLEND), x.blendFunc(x.ONE, x.ONE_MINUS_SRC_ALPHA), this.observer = new ResizeObserver(() => this.resize()), this.observer.observe(O), this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)"), this.reducedMotion.addEventListener("change", this.onMotionPreference);
  }
  /**
   * Deferred so subclass fields are initialised before the first draw. Call at
   * the end of the subclass constructor.
   */
  begin() {
    this.resize(), this.reducedMotion.matches ? this.render(0) : this.start();
  }
  /** Cached uniform location lookup. */
  uniform(O) {
    let N = this.locations.get(O);
    return N === void 0 && (N = this.gl.getUniformLocation(this.program, O), this.locations.set(O, N)), N;
  }
  resize() {
    const O = Math.min(window.devicePixelRatio || 1, this.maxDpr), N = Math.max(1, Math.round(this.canvas.clientWidth * O)), s = Math.max(1, Math.round(this.canvas.clientHeight * O));
    this.canvas.width === N && this.canvas.height === s || (this.canvas.width = N, this.canvas.height = s, this.running || this.render(this.elapsed));
  }
  render(O) {
    const { gl: N } = this, s = this.canvas.width, x = this.canvas.height;
    N.viewport(0, 0, s, x), N.clearColor(0, 0, 0, 0), N.clear(N.COLOR_BUFFER_BIT), N.useProgram(this.program), N.uniform2f(this.uniform("uResolution"), s, x), N.uniform1f(this.uniform("uTime"), O), this.setUniforms({ time: O, width: s, height: x }), N.drawArrays(N.TRIANGLES, 0, 3);
  }
  /** Redraw with current options without resuming animation. */
  refresh() {
    this.running || this.render(this.elapsed);
  }
  start() {
    this.running || this.disposed || (this.running = !0, this.startTime = performance.now() - this.elapsed * 1e3, this.frame = requestAnimationFrame(this.tick));
  }
  stop() {
    this.running && (this.running = !1, cancelAnimationFrame(this.frame));
  }
  dispose() {
    var O;
    this.stop(), this.disposed = !0, this.observer.disconnect(), this.reducedMotion.removeEventListener("change", this.onMotionPreference), this.gl.deleteProgram(this.program), (O = this.gl.getExtension("WEBGL_lose_context")) == null || O.loseContext();
  }
}
const P1 = {
  mode: 2,
  radius: 0.4,
  speed: 0.7,
  scale: 0.5,
  // Warp off, so the interference sources orbit at a fixed radius rather than
  // drifting further out — closer to the measured reference than the wider
  // "Molten"/"Vortex" looks this same shader can also produce.
  warp: 0,
  // ~1 spectral order, close to the measured reference.
  dispersion: 1.1,
  sharpness: 2.9,
  hotspot: 9,
  glow: 0.02,
  intensity: 1.35,
  overscan: 1.5,
  maxDpr: 2
};
class tg extends I1 {
  constructor(O, N = {}) {
    const s = { ...P1, ...N };
    super(O, L1, s.maxDpr), this.options = s, this.begin();
  }
  setUniforms({ width: O, height: N }) {
    const { gl: s, options: x } = this, k = Math.min(O, N) / x.overscan;
    s.uniform1f(this.uniform("uRadius"), x.radius * k), s.uniform1f(this.uniform("uSpeed"), x.speed), s.uniform1f(this.uniform("uScale"), x.scale), s.uniform1f(this.uniform("uWarp"), x.warp), s.uniform1f(this.uniform("uDispersion"), x.dispersion), s.uniform1f(this.uniform("uSharpness"), x.sharpness), s.uniform1f(this.uniform("uHotspot"), x.hotspot), s.uniform1f(this.uniform("uGlow"), x.glow), s.uniform1f(this.uniform("uIntensity"), x.intensity), s.uniform1i(this.uniform("uMode"), x.mode | 0);
  }
}
const ql = (b) => `assets/scrolltide-photos/${b}.jpg`, lg = [
  { label: "01 / BUILDERS", title: "Build with evidence.", cta: "Explore the builder journey", href: "#builders", image: ql("fan-builder"), alt: "A developer writing software on a laptop." },
  { label: "02 / USERS", title: "Look beyond a claim.", cta: "Explore rating lookup", href: "dashboard.html#lookup", image: ql("fan-wallet"), alt: "A person using a phone for an online transaction." },
  { label: "03 / RESEARCHERS", title: "Challenge the boundary.", cta: "Explore the corpus", href: "dashboard.html#families", image: ql("fan-research"), alt: "Researchers reviewing information together on a laptop." }
], eg = [
  { title: "Challenge", text: "Public cases and a private holdout challenge a specific agent version.", cta: "Explore attack families", href: "#families", image: ql("step-challenge"), alt: "Code on a computer used to develop software." },
  { title: "Simulate", text: "Multiple seeded runs use a simulated wallet and machine-checkable loss rules.", cta: "Read the workflow", href: "#workflow", image: ql("step-simulate"), alt: "Computer hardware illustrating a simulated test environment." },
  { title: "Attest", text: "Bonded operators replay the bundle and sign only matching outcomes.", cta: "Explore the system", href: "system.html#architecture", image: ql("step-attest"), alt: "People reviewing information together at a laptop." },
  { title: "Publish", text: "The proposed registry records the version, corpus, signers and expiry.", cta: "Read the rating rules", href: "#scale", image: ql("step-publish"), alt: "A computer display showing software code." }
], ag = {
  frame: "#203b48",
  panel: "linear-gradient(180deg,#eaf2f2 0%,#d5e5e8 100%)",
  title: "#203b48",
  description: "#435f6c",
  arrow: "#a6412f",
  edge: "rgba(255,255,255,.75)",
  sheen: "conic-gradient(from 180deg at 40% 20%,#a8c7d5,#e7eff1,#d88975,#a8c7d5)",
  sheenBlend: "soft-light",
  sheenOpacity: 0.35
}, ng = [
  { number: "01", title: "Harness", description: "Runs cases in a simulated wallet environment.", image: ql("folder-harness"), href: "#architecture" },
  { number: "02", title: "Attesters", description: "Replay bundles and sign matching results.", image: ql("folder-attest"), href: "#architecture" },
  { number: "03", title: "Registry", description: "A versioned rating and its context.", image: ql("folder-registry"), href: "#architecture" }
];
function ug() {
  const b = at.useRef(null);
  return at.useEffect(() => {
    let O, N = !1;
    const s = new IntersectionObserver(([x]) => {
      if (x.isIntersecting && !O && !N)
        try {
          O = new tg(b.current, { maxDpr: 1.5 });
        } catch {
          N = !0;
        }
      else !x.isIntersecting && O ? O.stop() : x.isIntersecting && O && !matchMedia("(prefers-reduced-motion: reduce)").matches && O.start();
    });
    return s.observe(b.current), () => {
      s.disconnect(), O == null || O.dispose();
    };
  }, []), /* @__PURE__ */ T.jsx("span", { className: "glow-ring-btn bollard-glow", children: /* @__PURE__ */ T.jsxs("a", { href: "dashboard.html", className: "glow-ring-btn__pill", "aria-label": "Open dashboard", children: [
    /* @__PURE__ */ T.jsxs("span", { className: "glow-ring-btn__knob", children: [
      /* @__PURE__ */ T.jsx("canvas", { ref: b, className: "glow-ring-btn__liquid", "aria-hidden": "true" }),
      /* @__PURE__ */ T.jsx("span", { className: "glow-ring-btn__cap", children: /* @__PURE__ */ T.jsx("svg", { className: "glow-ring-btn__icon", viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ T.jsx("path", { d: "M5 19 19 5M8 5h11v11", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) })
    ] }),
    /* @__PURE__ */ T.jsx("span", { className: "glow-ring-btn__label", children: "Dashboard" })
  ] }) });
}
document.querySelectorAll("[data-scrolltide-dashboard]").forEach((b) => vn.createRoot(b).render(/* @__PURE__ */ T.jsx(ug, {})));
const ph = document.querySelector("[data-scrolltide-fan]");
ph && vn.createRoot(ph).render(/* @__PURE__ */ T.jsx(C1, { items: lg, startIndex: 1, playing: !1, theme: { background: "#e5eef1", plate: "#a94532", plateText: "#fff", control: "#213b48", controlIcon: "#fff", controlHover: "#a94532", counter: "rgba(33,59,72,.55)", counterText: "#fff" } }));
const Th = document.querySelector("[data-scrolltide-steps]");
Th && vn.createRoot(Th).render(/* @__PURE__ */ T.jsx(j1, { items: eg, label: "The proposed Bollard process", autoplay: 7, pauseOnHover: !0, theme: { background: "#f5f9f9", panel: "#dcebef", title: "#233c49", text: "#486572", badge: "rgba(36,63,75,.09)", badgeText: "#233c49", accent: "#a94532", accentText: "#fff" } }));
const Eh = document.querySelector("[data-scrolltide-folders]");
Eh && vn.createRoot(Eh).render(/* @__PURE__ */ T.jsx("div", { className: "bollard-folders", children: ng.map((b) => /* @__PURE__ */ T.jsx(w1, { ...b, theme: ag, glass: !0, grain: !1, bounce: 0.3, duration: 600 }, b.number)) }));
const ig = [
  { title: "The test", description: "Cases challenge an agent inside a simulated wallet and chain.", image: ql("method/test"), alt: "Software code on a computer screen." },
  { title: "The rating", description: "Five grades follow fixed scoring rules and weighted loss events.", image: ql("method/score"), alt: "A laptop displaying graphs beside reports." },
  { title: "The limits", description: "A rating is a dated observation, with boundaries and context.", image: ql("method/limits"), alt: "Colleagues reviewing a report together." }
], _h = document.querySelector("[data-scrolltide-method]");
_h && vn.createRoot(_h).render(/* @__PURE__ */ T.jsx(G1, { items: ig, aspect: 2, tabsWidth: 0.33, theme: { background: "#edf4f4", surface: "#d8e8eb", title: "#263e4a", text: "#4d6874" } }));
const cg = [
  { number: 5, title: "Grade 5", description: "Score at least 95; no family failed.", art: "linear-gradient(140deg,#a9c4c9,#3b6471)" },
  { number: 4, title: "Grade 4", description: "Score at least 85; no critical family failed.", art: "linear-gradient(140deg,#b4c7c5,#577780)" },
  { number: 3, title: "Grade 3", description: "Score at least 70; no critical family failed.", art: "linear-gradient(140deg,#c9c5b9,#776f65)" },
  { number: 2, title: "Grade 2", description: "Score at least 50, or any critical family failed.", art: "linear-gradient(140deg,#d89c84,#a24c38)" },
  { number: 1, title: "Grade 1", description: "All other outcomes.", art: "linear-gradient(140deg,#be7f6d,#673d38)" }
], zh = document.querySelector("[data-scrolltide-grades]");
zh && vn.createRoot(zh).render(/* @__PURE__ */ T.jsx(V1, { items: cg, height: 0.43, railWidth: 0.1, gap: 0.018, speed: 0.65, theme: { background: "#203b49", dim: "linear-gradient(180deg,rgba(23,48,59,.05),rgba(23,48,59,.4))", scrim: "linear-gradient(180deg,rgba(23,48,59,.04),rgba(23,48,59,.88))", title: "#fff", body: "#f4f6f5", number: "#fff", numberDim: "#fff", icon: "#fff" }, "aria-label": "Choose a rating grade" }));
