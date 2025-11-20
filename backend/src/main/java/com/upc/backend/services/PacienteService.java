package com.upc.backend.services;

import com.upc.backend.dtos.PacienteDTO;
import com.upc.backend.entities.Paciente;
import com.upc.backend.interfaces.IPacienteService;
import com.upc.backend.repositories.PacienteRepository;
import com.upc.backend.security.entities.ERol;
import com.upc.backend.security.entities.Rol;
import com.upc.backend.security.entities.Usuario;
import com.upc.backend.security.repositories.RolRepository;
import com.upc.backend.security.repositories.UsuarioRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Set;

@Service
public class PacienteService implements IPacienteService {
    @Autowired
    private PacienteRepository pacienteRepository;
    @Autowired
    private ModelMapper modelMapper;
    @Autowired
    private RolRepository rolRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private UsuarioRepository usuarioRepository;

    private void validarDatosPaciente(PacienteDTO pacienteDTO) {
        String dniLimpio = pacienteDTO.getDni().replaceAll("\\s", "");
        if (!dniLimpio.matches("\\d{8}")) {
            throw new RuntimeException("El DNI debe tener exactamente 8 dígitos numéricos");
        }
        pacienteDTO.setDni(dniLimpio);

        String telefonoLimpio = pacienteDTO.getTelefono().replaceAll("\\s", "");
        if (!telefonoLimpio.matches("\\d{9}")) {
            throw new RuntimeException("El teléfono debe tener exactamente 9 dígitos numéricos");
        }
        pacienteDTO.setTelefono(telefonoLimpio);

        if (!pacienteDTO.getEmail().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new RuntimeException("El formato del email es inválido");
        }

        LocalDate fechaNacimiento = pacienteDTO.getFechaNacimiento();
        LocalDate fechaActual = LocalDate.now();

        int edad = Period.between(fechaNacimiento, fechaActual).getYears();

        if (edad < 18) {
            throw new RuntimeException("Debe ser mayor de edad (18 años o más)");
        }
    }

    @Override
    public PacienteDTO registrar(PacienteDTO pacienteDTO) {
        validarDatosPaciente(pacienteDTO);

        if (usuarioRepository.existsByEmail(pacienteDTO.getEmail())) {
            throw new RuntimeException("El email proporcionado ya está registrado");
        }

        if (pacienteRepository.existsByDni(pacienteDTO.getDni())) {
            throw new RuntimeException("El DNI proporcionado ya está registrado");
        }

        if (pacienteRepository.existsByTelefono(pacienteDTO.getTelefono())) {
            throw new RuntimeException("El teléfono proporcionado ya está registrado");
        }

        Rol rol = rolRepository.findByNombre(ERol.ROLE_PACIENTE)
                .orElseThrow(() -> new RuntimeException("ROLE_PACIENTE no definido"));


        Usuario usuario = Usuario.builder()
                .email(pacienteDTO.getEmail())
                .password(passwordEncoder.encode(pacienteDTO.getPassword()))
                .dni(pacienteDTO.getDni())
                .roles(Set.of(rol))
                .build();

        Usuario guardado = usuarioRepository.save(usuario);

        Paciente paciente = modelMapper.map(pacienteDTO, Paciente.class);
        paciente.setIdPaciente(null);
        paciente.setPassword(passwordEncoder.encode(pacienteDTO.getPassword()));
        paciente.setActivo(true);
        paciente.setUsuario(guardado);

        Paciente pacienteGuardado = pacienteRepository.save(paciente);
        return modelMapper.map(pacienteGuardado, PacienteDTO.class);
    }

    @Override
    public PacienteDTO modificar(String dni, PacienteDTO pacienteDTO) {
        // Validar solo los campos que vienen en el DTO
        if (pacienteDTO.getDni() != null && !pacienteDTO.getDni().isEmpty()) {
            String dniLimpio = pacienteDTO.getDni().replaceAll("\\s", "");
            if (!dniLimpio.matches("\\d{8}")) {
                throw new RuntimeException("El DNI debe tener exactamente 8 dígitos numéricos");
            }
            pacienteDTO.setDni(dniLimpio);
        }

        if (pacienteDTO.getTelefono() != null && !pacienteDTO.getTelefono().isEmpty()) {
            String telefonoLimpio = pacienteDTO.getTelefono().replaceAll("\\s", "");
            if (!telefonoLimpio.matches("\\d{9}")) {
                throw new RuntimeException("El teléfono debe tener exactamente 9 dígitos numéricos");
            }
            pacienteDTO.setTelefono(telefonoLimpio);
        }

        if (pacienteDTO.getEmail() != null && !pacienteDTO.getEmail().isEmpty()) {
            if (!pacienteDTO.getEmail().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                throw new RuntimeException("El formato del email es inválido");
            }
        }

        Paciente pacienteExistente = pacienteRepository.findByDni(dni)
                .orElseThrow(() -> new RuntimeException("Paciente no encontrado"));

        Usuario usuarioExistente = pacienteExistente.getUsuario();
        boolean hayCambios = false;

        // Actualizar email si es diferente
        String nuevoEmail = pacienteDTO.getEmail();
        if (nuevoEmail != null && !nuevoEmail.trim().isEmpty() &&
                !usuarioExistente.getEmail().equals(nuevoEmail)) {

            if (usuarioRepository.existsByEmail(nuevoEmail)) {
                throw new RuntimeException("El email ya está registrado por otro usuario");
            }
            usuarioExistente.setEmail(nuevoEmail);
            pacienteExistente.setEmail(nuevoEmail);
            hayCambios = true;
        }

        if (pacienteDTO.getPassword() != null && !pacienteDTO.getPassword().trim().isEmpty()) {
            String passwordCifrada = passwordEncoder.encode(pacienteDTO.getPassword());
            usuarioExistente.setPassword(passwordCifrada);
            pacienteExistente.setPassword(passwordCifrada);
            hayCambios = true;
        }

        // Actualizar otros campos si se proporcionan
        if (pacienteDTO.getNombre() != null && !pacienteDTO.getNombre().trim().isEmpty()) {
            pacienteExistente.setNombre(pacienteDTO.getNombre());
            hayCambios = true;
        }

        if (pacienteDTO.getApellido() != null && !pacienteDTO.getApellido().trim().isEmpty()) {
            pacienteExistente.setApellido(pacienteDTO.getApellido());
            hayCambios = true;
        }

        if (pacienteDTO.getGenero() != null && !pacienteDTO.getGenero().trim().isEmpty()) {
            pacienteExistente.setGenero(pacienteDTO.getGenero());
            hayCambios = true;
        }

        if (pacienteDTO.getTelefono() != null && !pacienteDTO.getTelefono().trim().isEmpty()) {
            if (pacienteRepository.existsByTelefono(pacienteDTO.getTelefono()) &&
                    !pacienteExistente.getTelefono().equals(pacienteDTO.getTelefono())) {
                throw new RuntimeException("El teléfono ya está registrado");
            }
            pacienteExistente.setTelefono(pacienteDTO.getTelefono());
            hayCambios = true;
        }

        if (pacienteDTO.getDistrito() != null && !pacienteDTO.getDistrito().trim().isEmpty()) {
            pacienteExistente.setDistrito(pacienteDTO.getDistrito());
            hayCambios = true;
        }

        if (pacienteDTO.getDireccion() != null && !pacienteDTO.getDireccion().trim().isEmpty()) {
            pacienteExistente.setDireccion(pacienteDTO.getDireccion());
            hayCambios = true;
        }

        if (pacienteDTO.getFechaNacimiento() != null) {
            pacienteExistente.setFechaNacimiento(pacienteDTO.getFechaNacimiento());
            hayCambios = true;
        }

        if (!hayCambios) {
            throw new RuntimeException("No se proporcionaron datos para modificar");
        }

        usuarioRepository.save(usuarioExistente);
        Paciente pacienteActualizado = pacienteRepository.save(pacienteExistente);
        return modelMapper.map(pacienteActualizado, PacienteDTO.class);
    }

    @Override
    public PacienteDTO listarPorDni(String dni){
        return pacienteRepository.findByDni(dni)
                .map(paciente -> modelMapper.map(paciente, PacienteDTO.class))
                .orElse(null);
    }

    @Override
    public List<PacienteDTO> listarPacientesActivos(){
        return pacienteRepository.listarPacientesActivos()
                .stream()
                .map(paciente -> modelMapper.map(paciente, PacienteDTO.class))
                .toList();
    }

    @Override
    public List<PacienteDTO> listarTodos(){
        return pacienteRepository.findAll()
                .stream()
                .map(paciente -> modelMapper.map(paciente, PacienteDTO.class))
                .toList();
    }
}
