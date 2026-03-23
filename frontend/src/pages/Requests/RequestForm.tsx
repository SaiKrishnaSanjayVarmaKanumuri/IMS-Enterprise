import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { apiClient } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { Site, RequestType } from "../../types";

interface RequestFormData {
    type: RequestType;
    siteId: string;
    targetSiteId?: string;
    description: string;
    justification?: string;
    expectedDate?: string;
    priority: string;
    items: Array<{
        itemName: string;
        quantity: number;
        unit: string;
        specifications?: string;
        notes?: string;
    }>;
}

const RequestForm: React.FC = () => {
    const navigate = useNavigate();
    const { } = useAuth();
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        control,
    } = useForm<RequestFormData>({
        defaultValues: {
            type: "MATERIAL",
            priority: "normal",
            items: [{ itemName: "", quantity: 1, unit: "pcs" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const requestType = watch("type");

    useEffect(() => {
        const fetchSites = async () => {
            try {
                const response = await apiClient.sites.list();
                if (response.data.success) {
                    setSites((response.data.data as { sites: Site[] }).sites);
                }
            } catch (err) {
                console.error("Failed to fetch sites:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSites();
    }, []);

    const onSubmit = async (data: RequestFormData) => {
        setSubmitting(true);
        setError("");

        try {
            const response = await apiClient.requests.create(data);

            if (response.data.success) {
                navigate("/fm/requests");
            } else {
                setError(response.data.error || "Failed to create request");
            }
        } catch (err: unknown) {
            const axiosError = err as {
                response?: { data?: { error?: string } };
            };
            setError(
                axiosError.response?.data?.error || "Failed to create request",
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                New Material Request
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Request Type
                            </label>
                            <select
                                {...register("type")}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="MATERIAL">
                                    Material Request
                                </option>
                                <option value="SHIFTING">
                                    Material Shifting
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Site
                            </label>
                            <select
                                {...register("siteId", {
                                    required: "Site is required",
                                })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="">Select site</option>
                                {sites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.name} ({site.code})
                                    </option>
                                ))}
                            </select>
                            {errors.siteId && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.siteId.message}
                                </p>
                            )}
                        </div>

                        {requestType === "SHIFTING" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Target Site
                                </label>
                                <select
                                    {...register("targetSiteId", {
                                        required:
                                            "Target site is required for shifting",
                                    })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Select target site</option>
                                    {sites
                                        .filter((s) => s.id !== watch("siteId"))
                                        .map((site) => (
                                            <option
                                                key={site.id}
                                                value={site.id}
                                            >
                                                {site.name} ({site.code})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Priority
                            </label>
                            <select
                                {...register("priority")}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Expected Date
                            </label>
                            <input
                                type="date"
                                {...register("expectedDate")}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <textarea
                            {...register("description", {
                                required: "Description is required",
                            })}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Describe the materials needed and purpose"
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Justification
                        </label>
                        <textarea
                            {...register("justification")}
                            rows={2}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Reason for this request"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Request Items
                        </h2>
                        <button
                            type="button"
                            onClick={() =>
                                append({
                                    itemName: "",
                                    quantity: 1,
                                    unit: "pcs",
                                })
                            }
                            className="text-sm text-primary-600 hover:text-primary-700"
                        >
                            + Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="grid grid-cols-12 gap-4 items-start p-4 bg-gray-50 rounded-md"
                            >
                                <div className="col-span-4">
                                    <input
                                        {...register(
                                            `items.${index}.itemName`,
                                            { required: "Item name required" },
                                        )}
                                        placeholder="Item name"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        {...register(
                                            `items.${index}.quantity`,
                                            { required: true, min: 1 },
                                        )}
                                        placeholder="Qty"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <select
                                        {...register(`items.${index}.unit`)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="pcs">Pieces</option>
                                        <option value="kg">Kilograms</option>
                                        <option value="meters">Meters</option>
                                        <option value="liters">Liters</option>
                                        <option value="bags">Bags</option>
                                        <option value="tons">Tons</option>
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <input
                                        {...register(
                                            `items.${index}.specifications`,
                                        )}
                                        placeholder="Specifications"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                        {submitting ? "Submitting..." : "Submit Request"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RequestForm;
