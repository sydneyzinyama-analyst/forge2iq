package com.forge2iq.auth;

import com.forge2iq.auth.dto.LoginRequest;
import com.forge2iq.auth.dto.LoginResponse;
import com.forge2iq.auth.dto.RegisterCompanyRequest;
import com.forge2iq.company.Company;
import com.forge2iq.company.CompanyRepository;
import com.forge2iq.security.JwtUtil;
import com.forge2iq.user.Role;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public LoginResponse registerCompany(RegisterCompanyRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        Company company = companyRepository.save(
            Company.builder().name(request.companyName()).build()
        );
        User admin = userRepository.save(User.builder()
            .name(request.adminName())
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            .role(Role.COMPANY_ADMIN)
            .company(company)
            .build());
        return new LoginResponse(jwtUtil.generateToken(admin), admin.getName(), admin.getEmail(), admin.getRole(), company.getId());
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return new LoginResponse(jwtUtil.generateToken(user), user.getName(), user.getEmail(), user.getRole(), user.getCompany().getId());
    }
}
