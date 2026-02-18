import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthChanged, type User } from "@taurex/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isApex: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isApex: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApex, setIsApex] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        setIsApex(!!tokenResult.claims.admin);
      } else {
        setIsApex(false);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isApex }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
