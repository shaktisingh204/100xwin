'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ─── Inlined maintenance types & helpers (source: newwebsite/src/lib/maintenance.ts) ───

export type MaintenanceScope = 'platform' | 'sports' | 'casino';

export type MaintenanceSectionState = {
    enabled: boolean;
    message: string;
};

export type MaintenanceConfig = Record<MaintenanceScope, MaintenanceSectionState> & { allowedUsers: string[] };

export const defaultMaintenanceConfig: MaintenanceConfig = {
    platform: { enabled: false, message: '' },
    sports: { enabled: false, message: '' },
    casino: { enabled: false, message: '' },
    allowedUsers: [],
};

const normalizeSection = (input: unknown): MaintenanceSectionState => {
    if (!input || typeof input !== 'object') {
        return { enabled: false, message: '' };
    }

    const section = input as Partial<MaintenanceSectionState>;
    return {
        enabled: Boolean(section.enabled),
        message: String(section.message || '').trim(),
    };
};

export const extractMaintenanceConfig = (settings: unknown): MaintenanceConfig => {
    const source = settings && typeof settings === 'object'
        ? settings as Record<string, unknown>
        : {};

    let parsedConfig: Partial<MaintenanceConfig> = {};

    if (source.maintenanceConfig && typeof source.maintenanceConfig === 'object') {
        parsedConfig = source.maintenanceConfig as Partial<MaintenanceConfig>;
    } else if (typeof source.MAINTENANCE_CONFIG === 'string') {
        try {
            parsedConfig = JSON.parse(source.MAINTENANCE_CONFIG) as Partial<MaintenanceConfig>;
        } catch {
            parsedConfig = {};
        }
    }

    const platform = normalizeSection(parsedConfig.platform);
    const sports = normalizeSection(parsedConfig.sports);
    const casino = normalizeSection(parsedConfig.casino);

    if (source.MAINTENANCE_MODE === 'true') {
        platform.enabled = true;
    }
    if (!platform.message && typeof source.MAINTENANCE_MESSAGE === 'string') {
        platform.message = source.MAINTENANCE_MESSAGE.trim();
    }

    const allowedUsersStr = typeof source.MAINTENANCE_ALLOWED_USERS === 'string' ? source.MAINTENANCE_ALLOWED_USERS : '';
    const allowedUsers = allowedUsersStr.split(',').filter(Boolean).map(u => u.trim());

    return {
        platform,
        sports,
        casino,
        allowedUsers,
    };
};

export const isScopeBlocked = (config: MaintenanceConfig, scope: MaintenanceScope): boolean => {
    if (scope === 'platform') {
        return config.platform.enabled;
    }

    return config.platform.enabled || config[scope].enabled;
};

export const getMaintenanceMessage = (
    config: MaintenanceConfig,
    scope: MaintenanceScope,
    fallbackMessage: string,
): string => {
    if (config.platform.enabled) {
        return config.platform.message || fallbackMessage;
    }

    return config[scope].message || fallbackMessage;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSectionMaintenance(scope: MaintenanceScope, fallbackMessage: string) {
    const [config, setConfig] = useState<MaintenanceConfig>(defaultMaintenanceConfig);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const response = await api.get('/settings/public');
                if (cancelled) return;
                setConfig(extractMaintenanceConfig(response.data));
            } catch {
                if (cancelled) return;
                setConfig(defaultMaintenanceConfig);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const { user, isAuthenticated } = useAuth();

    let isBlocked = isScopeBlocked(config, scope);
    if (isBlocked && isAuthenticated && user) {
        const username = typeof user.username === 'string' ? user.username.toLowerCase() : '';
        const email = typeof user.email === 'string' ? user.email.toLowerCase() : '';
        const hasAccess = config.allowedUsers.some(u => {
            const search = u.toLowerCase();
            return search === username || search === email;
        });

        if (hasAccess) {
            isBlocked = false;
        }
    }

    return {
        config,
        loading,
        blocked: isBlocked,
        message: getMaintenanceMessage(config, scope, fallbackMessage),
    };
}
