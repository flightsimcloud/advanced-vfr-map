// https://github.com/flybywiresim/a32nx/blob/487e3741ef1e5ad7f47a81a9fd91c4379784c102/A32NX/html_ui/Pages/A32NX_Utils/NXDataStore.js
// NXDataStore.js

Include.addScript("/JS/dataStorage.js");

class DataStore {
    static get(key, defaultVal) {
        const val = GetStoredData(`ADV_${key}`);
        if (!val) {
            return defaultVal;
        }
        return val;
    }

    static set(key, val) {
        SetStoredData(`A32NX_${key}`, val);
    }
}