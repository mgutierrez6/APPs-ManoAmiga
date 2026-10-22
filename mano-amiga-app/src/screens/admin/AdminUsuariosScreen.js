import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Hero from '../../components/Hero';
import { Aparecer, Avatar, Boton, Campo, Cargando, Chip, MensajeError, Pastilla, Tarjeta, TextoSuave, Vacio } from '../../components/ui';
import { useCarga } from '../../hooks/useCarga';
import { actualizarJudicial, asignarCoordinador, listarOrganizaciones, listarUsuarios, quitarCoordinador } from '../../api/admin';
import { mensajeDeError } from '../../api/client';
import { colores, espacio, estilosDinamicos, fuentes } from '../../constants/tema';
import { confirmar } from '../../utils/confirmar';

const ROLES = [
  { valor: null, texto: 'Todos' },
  { valor: 'voluntario', texto: 'Voluntarios' },
  { valor: 'coordinador', texto: 'Coordinadores' },
  { valor: 'admin', texto: 'Admins' },
];

/**
 * R7 · Gestión de usuarios: asignar / quitar coordinadores y la condición judicial (atributo ABAC).
 * Toda acción pide la contraseña del admin (RS9) y queda en la auditoría.
 */
export default function AdminUsuariosScreen() {
  const [rol, setRol] = useState(null);
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [abierto, setAbierto] = useState(null);
  const { datos, setDatos, cargando, error, recargar } = useCarga(
    () => listarUsuarios({ rol: rol || undefined, buscar: buscar || undefined, limit: 50 }),
    [rol, buscar]
  );
  const orgs = useCarga(() => listarOrganizaciones({ limit: 50 }), []);
  const orgsActivas = (orgs.datos?.data || []).filter((o) => o.activa);

  // Reemplaza un usuario de la lista con lo que devolvió la API (sin recargar todo).
  const reemplazar = (u) => setDatos((d) => ({ ...d, data: d.data.map((x) => (x.id === u.id ? u : x)) }));

  const cabecera = (
    <>
      <Hero titulo="Usuarios" subtitulo="Roles y programa judicial" tema="lila" figuras={1} />
      <View style={styles.relleno}>
        <View style={{ marginTop: espacio.m }}>
          <Campo
           
            placeholder="Buscar por nombre o email"
            value={texto}
            onChangeText={setTexto}
            returnKeyType="search"
            autoCapitalize="none"
            onSubmitEditing={() => setBuscar(texto.trim())}
            onBlur={() => setBuscar(texto.trim())}
          />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {ROLES.map((r) => (
          <Chip key={r.texto} texto={r.texto} clave={r.texto} activo={rol === r.valor} onPress={() => setRol(r.valor)} />
        ))}
      </ScrollView>
      <View style={styles.relleno}>
        <MensajeError texto={error} onReintentar={recargar} />
      </View>
    </>
  );

  return (
    <FlatList
      style={styles.contenedor}
      contentContainerStyle={styles.lista}
      data={datos?.data || []}
      keyExtractor={(u) => u.id}
      ListHeaderComponent={cabecera}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={cargando ? <Cargando /> : <Vacio texto="No encontramos usuarios con ese filtro." />}
      renderItem={({ item, index }) => (
        <Aparecer indice={index} estilo={styles.relleno}>
          <Tarjeta>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: abierto === item.id }}
              onPress={() => setAbierto(abierto === item.id ? null : item.id)}
              style={styles.fila}
            >
              <Avatar nombre={item.nombre} apellido={item.apellido} tamano={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {item.nombre} {item.apellido}
                </Text>
                <TextoSuave numberOfLines={1}>{item.email}</TextoSuave>
              </View>
              <Text style={styles.flecha}>{abierto === item.id ? '˄' : '˅'}</Text>
            </Pressable>
            <View style={styles.pastillas}>
              <Pastilla texto={item.rol} clave={item.rol} />
              {item.organizacion ? <Pastilla texto={item.organizacion.nombre} clave="org" /> : null}
              {item.esJudicial ? <Pastilla texto={`Judicial · ${item.horasAsignadas} h`} clave="judicial" /> : null}
            </View>
            {abierto === item.id ? <Acciones usuario={item} orgs={orgsActivas} onCambio={reemplazar} onQuitado={recargar} /> : null}
          </Tarjeta>
        </Aparecer>
      )}
    />
  );
}

function Acciones({ usuario, orgs, onCambio, onQuitado }) {
  const [orgElegida, setOrgElegida] = useState(null);
  const [judicial, setJudicial] = useState(usuario.esJudicial);
  const [horas, setHoras] = useState(usuario.horasAsignadas ? String(usuario.horasAsignadas) : '');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const ejecutar = async (fn) => {
    setOcupado(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  if (usuario.rol === 'admin') return <TextoSuave estilo={styles.acciones}>Las cuentas de administrador no se gestionan desde la app.</TextoSuave>;

  if (usuario.rol === 'coordinador') {
    return (
      <View style={styles.acciones}>
        <TextoSuave>Al quitarle el rol vuelve a ser voluntario/a y se cierran todas sus sesiones al instante.</TextoSuave>
        <MensajeError texto={error} />
        <Boton
          titulo="Quitar coordinador"
          variante="peligro"
          chico
          cargando={ocupado}
          onPress={async () => {
            if (!(await confirmar('¿Quitar el rol de coordinador?', `${usuario.nombre} pierde el acceso a ${usuario.organizacion?.nombre || 'su organización'}.`, 'Quitar'))) return;
            ejecutar(async () => {
              await quitarCoordinador(usuario.id);
              onQuitado();
            });
          }}
        />
      </View>
    );
  }

  // Voluntario
  return (
    <View style={styles.acciones}>
      <Text style={styles.accionTitulo}>Programa judicial</Text>
      <View style={styles.switchFila}>
        <Text style={styles.switchTexto}>{judicial ? 'Cumple horas de trabajo comunitario' : 'No es del programa judicial'}</Text>
        <Switch value={judicial} onValueChange={setJudicial} trackColor={{ true: colores.lila, false: colores.borde }} thumbColor={colores.blanco} />
      </View>
      {judicial ? <Campo etiqueta="Horas asignadas" value={horas} onChangeText={(t) => setHoras(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={4} /> : null}
      <Boton
        titulo="Guardar condición judicial"
        variante="lila"
        chico
        cargando={ocupado}
        deshabilitado={judicial === usuario.esJudicial && (!judicial || Number(horas) === usuario.horasAsignadas)}
        onPress={() => {
          if (judicial && !(Number(horas) > 0)) return setError('Indicá cuántas horas tiene asignadas');
          ejecutar(async () => onCambio(await actualizarJudicial(usuario.id, judicial, Number(horas))));
        }}
      />

      {!usuario.esJudicial ? (
        <>
          <Text style={[styles.accionTitulo, { marginTop: espacio.m }]}>Hacer coordinador/a de…</Text>
          {orgs.length ? (
            <View style={styles.pastillas}>
              {orgs.map((o) => (
                <Chip key={o.id} texto={o.nombre} clave={o.id} activo={orgElegida === o.id} onPress={() => setOrgElegida(o.id)} />
              ))}
            </View>
          ) : (
            <TextoSuave>No hay organizaciones activas.</TextoSuave>
          )}
          <Boton
            titulo="Asignar como coordinador"
            variante="secundario"
            chico
            cargando={ocupado}
            deshabilitado={!orgElegida}
            onPress={() => ejecutar(async () => onCambio(await asignarCoordinador(usuario.id, orgElegida)))}
          />
        </>
      ) : (
        <TextoSuave estilo={{ marginTop: espacio.s }}>Una persona del programa judicial no puede ser coordinadora.</TextoSuave>
      )}
      <MensajeError texto={error} />
    </View>
  );
}

const styles = estilosDinamicos(() => ({
  contenedor: { flex: 1, backgroundColor: colores.crema },
  lista: { paddingBottom: espacio.xl, flexGrow: 1 },
  relleno: { paddingHorizontal: espacio.l },
  filtros: { paddingHorizontal: espacio.l, paddingBottom: espacio.s },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  nombre: { fontFamily: fuentes.tituloMedio, fontSize: 17, color: colores.tinta },
  flecha: { fontFamily: fuentes.titulo, fontSize: 20, color: colores.gris },
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', marginTop: espacio.s },
  acciones: { marginTop: espacio.s, paddingTop: espacio.m, borderTopWidth: 2, borderTopColor: colores.borde },
  accionTitulo: { fontFamily: fuentes.negrita, color: colores.tinta, marginBottom: espacio.s },
  switchFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espacio.s, gap: espacio.s },
  switchTexto: { flex: 1, fontFamily: fuentes.textoMedio, color: colores.tintaSuave },
}));
