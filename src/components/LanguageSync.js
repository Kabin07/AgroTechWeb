// When someone logs in, switch the app to the language saved on their account.
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { DICTIONARIES, useI18n } from "../i18n";

export default function LanguageSync() {
  const { user } = useAuth();
  const { setLang } = useI18n();
  const lastUserId = useRef(null);

  useEffect(() => {
    const id = user?.id || null;
    if (id && id !== lastUserId.current && DICTIONARIES[user.preferred_language]) setLang(user.preferred_language);
    lastUserId.current = id;
  }, [user, setLang]);

  return null;
}
