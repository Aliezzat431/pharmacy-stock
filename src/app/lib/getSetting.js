import { getSettingModel } from "./models/Setting";

export async function getSetting(conn, key, defaultValue) {
    try {
        const Setting = getSettingModel(conn);
        const setting = await Setting.findOne({ key });
        if (setting) {
            return setting.value;
        }
        return defaultValue;
    } catch (err) {
        console.error("getSetting error:", err);
        return defaultValue;
    }
}
