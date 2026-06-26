package com.forge2iq.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterCompanyRequest(
    @NotBlank String companyName,
    @NotBlank String adminName,
    @NotBlank @Email String email,
    @NotBlank String password
) {}
