import { passwordChange } from "@/api/auth.api";
import { useState } from "react";
import { useTranslation } from "react-i18next";


export default function SettingsPage() {

    const { t } = useTranslation();
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");


    async function changePassword(e: React.SubmitEvent) {
        e.preventDefault();
        console.log(password)

        if (!password || password !== repeatPassword) {
            return;
        }

        await passwordChange(password);
    }

    return (<>
        <form onSubmit={changePassword} >
            <fieldset className="fieldset">
                <legend className="fieldset-legend">{t("settings.change_password")}</legend>
                <input type="password" className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </fieldset>
            <fieldset className="fieldset">
                <legend className="fieldset-legend">{t("settings.repeat_password")}</legend>
                <input type="password" className="input" placeholder="Password" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
            </fieldset>
            <button className="btn" type="submit">Change Password</button>
        </form>


    </>);
}