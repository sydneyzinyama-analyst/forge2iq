package com.forge2iq.auth.dto;

import com.forge2iq.user.Role;

public record LoginResponse(String token, String name, String email, Role role, Long companyId) {}
