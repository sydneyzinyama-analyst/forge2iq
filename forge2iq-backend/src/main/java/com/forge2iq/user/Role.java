package com.forge2iq.user;

public enum Role {
    // Legacy values kept for DB compatibility
    SUPER_ADMIN, SUPERVISOR, OPERATOR,
    // Current roles
    COMPANY_ADMIN,
    PRINTING_MANAGER,
    PRODUCTION_MANAGER,
    DISPATCHER,
    OFFICE_MANAGER
}
