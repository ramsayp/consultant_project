// createApexTestWireAdapter calls Object.setPrototypeOf(fn, AdapterClass), which in some
// V8 environments makes Object.isExtensible return false for the resulting function.
// @lwc/jest-preset/src/setup.js throws "Invalid adapterId, it must be extensible" when that
// happens. Patch to always return true for functions carrying the .adapter property
// (the shape produced by createApexTestWireAdapter).
const _isExtensible = Object.isExtensible;
Object.isExtensible = function patchedIsExtensible(obj) {
  if (
    typeof obj === "function" &&
    Object.prototype.hasOwnProperty.call(obj, "adapter")
  ) {
    return true;
  }
  return _isExtensible.call(this, obj);
};
