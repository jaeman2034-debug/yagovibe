import React from 'react';

interface YagoButtonProps {
    text: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'success';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
}

export function YagoButton({
    text,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon
}: YagoButtonProps) {
    const baseClasses = "font-semibold transition-all duration-200 rounded-xl shadow-yago focus:outline-none focus:ring-2 focus:ring-yago-purple/50";

    const variantClasses = {
        primary: "bg-yago-purple hover:bg-yago-gradientEnd text-white",
        secondary: "bg-yago-gradient text-white hover:shadow-yago-lg",
        accent: "bg-yago-pink hover:bg-yago-gradient-pink text-white",
        outline: "border-2 border-yago-purple text-yago-purple hover:bg-yago-purple hover:text-white",
        success: "bg-green-600 hover:bg-green-700 text-white"
    };

    const sizeClasses = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg"
    };

    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95";

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} flex items-center gap-2`}
        >
            {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            {icon && !loading && icon}
            {text}
        </button>
    );
}

interface YagoCardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
    gradient?: boolean;
}

export function YagoCard({
    title,
    children,
    className = "",
    icon,
    gradient = false
}: YagoCardProps) {
    const cardClasses = gradient
        ? "bg-yago-gradient text-white shadow-yago-lg"
        : "bg-white shadow-yago border border-gray-100";

    return (
        <div className={`rounded-2xl p-6 ${cardClasses} ${className}`}>
            {title && (
                <div className="flex items-center gap-3 mb-4">
                    {icon && <div className="text-yago-purple">{icon}</div>}
                    <h3 className={`text-lg font-semibold ${gradient ? 'text-white' : 'text-yago-purple'}`}>
                        {title}
                    </h3>
                </div>
            )}
            {children}
        </div>
    );
}

interface YagoStatCardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ReactNode;
}

export function YagoStatCard({ title, value, change, trend = 'neutral', icon }: YagoStatCardProps) {
    const trendColors = {
        up: 'text-green-600',
        down: 'text-red-600',
        neutral: 'text-yago-gray'
    };

    return (
        <YagoCard className="hover:shadow-yago-lg transition-shadow duration-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-yago-gray font-medium">{title}</p>
                    <p className="text-2xl font-bold text-yago-purple mt-1">{value}</p>
                    {change && (
                        <p className={`text-xs mt-1 ${trendColors[trend]}`}>
                            {trend === 'up' && '↗'} {trend === 'down' && '↘'} {change}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="text-yago-purple/20 text-3xl">
                        {icon}
                    </div>
                )}
            </div>
        </YagoCard>
    );
}
