package com.web.chatbot.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import org.checkerframework.checker.units.qual.A;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    // A JWT has three parts:
    // Header (info about the algorithm)
    // Payload (data like username, role)
    // Signature ✅ (this is what we "sign")
    // we use your SECRET_KEY (e.g. "super_secret_key")
    // And apply an algorithm like HS256 (HMAC SHA-256)
    // This creates a signature (the 3rd part of the JWT)

    @Value("${jwt.secret.key}")
    private String secretKey;

    public String generateToken(String username, String role) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 1 day
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public String extractRole(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody().get("role", String.class);
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }
}
