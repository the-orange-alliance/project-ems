import { AtomEffect } from 'recoil';

export const localStorageEffect: (key: string) => AtomEffect<any> =
  (key: string) =>
  ({ setSelf, onSet }) => {
    const savedValue = localStorage.getItem(key);
    if (savedValue != null) {
      let val = undefined;
      try {
        val = JSON.parse(savedValue);
      } catch (_) {}
      setSelf(val);
    }

    onSet((newValue, _, isReset) => {
      isReset
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, JSON.stringify(newValue));
    });
  };

/**
 * An atom effect that is basically a local storage store, but also checks the query parameters
 * for a override default value.
 *
 * In a perfect world, the query parameter part would be its own effect, but unfortunatly, when
 * calling setSelf from the non-primary effect, it doesn't trigger the onSet event of the primary
 * effect, so we have to combine them.  It's dumb.
 *
 * @param key the query parameter/local storage key
 * @returns an atom effect
 */
export const localStorageQueryParamDefaultEffect: (
  key: string
) => AtomEffect<any> =
  (key: string) =>
  ({ setSelf, onSet }) => {
    const urlParams = new URLSearchParams(window.location.search);
    const qpVal = urlParams.get(key);
    const savedValue = localStorage.getItem(key);

    // The val to set
    let val = undefined;

    if (savedValue != null) {
      try {
        val = JSON.parse(savedValue);
      } catch (_) {}
    }

    // If the query param is set (and different)
    if (qpVal && qpVal !== val) {
      val = qpVal;
      localStorage.setItem(key, JSON.stringify(val));
    }

    // Set the value
    setSelf(val);

    onSet((newValue, _, isReset) => {
      isReset
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, JSON.stringify(newValue));
    });
  };
