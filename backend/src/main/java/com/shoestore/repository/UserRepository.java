package com.shoestore.repository;

import com.shoestore.entity.User;
import com.shoestore.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findFirstByRole(Role role);

    List<User> findAllByRoleOrderByCreatedAtDesc(Role role);

    boolean existsByUsername(String username);
}
