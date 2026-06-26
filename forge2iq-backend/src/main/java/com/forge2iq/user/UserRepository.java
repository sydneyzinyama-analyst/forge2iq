package com.forge2iq.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByCompanyId(Long companyId);
    List<User> findByCompanyIdAndRole(Long companyId, Role role);
    boolean existsByEmail(String email);
}
