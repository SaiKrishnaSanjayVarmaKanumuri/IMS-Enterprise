import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { apiClient } from "../services/api";
import { User, UserRole } from "../types";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    hasRole: (roles: UserRole | UserRole[]) => boolean;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const token = localStorage.getItem("ims_token");
        if (token) {
            fetchCurrentUser();
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const response = await apiClient.auth.me();
            if (response.data.success && response.data.data) {
                const data = response.data.data as { user: User };
                setUser(data.user);
            } else {
                localStorage.removeItem("ims_token");
                localStorage.removeItem("ims_user");
            }
        } catch (error) {
            localStorage.removeItem("ims_token");
            localStorage.removeItem("ims_user");
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await apiClient.auth.login(email, password);
        if (response.data.success && response.data.data) {
            const data = response.data.data as { user: User; token: string };
            localStorage.setItem("ims_token", data.token);
            localStorage.setItem("ims_user", JSON.stringify(data.user));
            setUser(data.user);
        }
    };

    const logout = async () => {
        try {
            await apiClient.auth.logout();
        } catch {
            // Ignore logout errors
        }
        localStorage.removeItem("ims_token");
        localStorage.removeItem("ims_user");
        setUser(null);
    };

    const hasRole = (roles: UserRole | UserRole[]) => {
        if (!user) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role.name as UserRole);
    };

    const hasPermission = (permission: string) => {
        if (!user?.permissions) return false;
        if (user.permissions.includes("*")) return true;
        return user.permissions.includes(permission);
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

export default AuthContext;
