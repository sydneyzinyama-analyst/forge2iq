package com.forge2iq.user.dto;

import com.forge2iq.user.Role;

public record UserResponse(Long id, String name, String email, Role role) {}
