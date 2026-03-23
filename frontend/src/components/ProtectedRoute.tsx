import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";
import { Navigate, Outlet } from "react-router-dom";
import { ReactNode, FC } from "react";

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
    requiredPermission?: string;
    children?: ReactNode;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({
    allowedRoles,
    requiredPermission,
    children,
}) => {
    const { isAuthenticated, isLoading, hasPermission, hasRole } =
        useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        if (!hasRole(allowedRoles)) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                            <h2 className="text-xl font-semibold">
                                Access Denied
                            </h2>
                            <p className="mt-2">
                                You do not have permission to access this page.
                            </p>
                        </div>
                        <a
                            href="/"
                            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            );
        }
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                        <h2 className="text-xl font-semibold">
                            Permission Required
                        </h2>
                        <p className="mt-2">
                            You do not have the required permission.
                        </p>
                    </div>
                    <a
                        href="/"
                        className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    if (children) {
        return <>{children}</>;
    }

    return <Outlet />;
};

export default ProtectedRoute;
