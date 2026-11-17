-- Esquema base de coco (tablas, llaves y restricciones), sacado con pg_dump de la base local.
-- Ya incluye las columnas de 02_egresos.sql. Para una base nueva y vacía.

--
-- PostgreSQL database dump
--

\restrict qrgLnzXUMwqns6yOKP9PXRC2Wm0XGTIdxs1YYzbzCUC4xrUbEHwXUzeG29x5c26

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cuentas_bancarias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuentas_bancarias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_id uuid NOT NULL,
    banco text DEFAULT 'BANCOLOMBIA'::text NOT NULL,
    tipo text DEFAULT 'AHORROS'::text NOT NULL,
    numero text NOT NULL,
    cta_contable text NOT NULL,
    clave_pdf_secret uuid
);

--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    nit text,
    prefijo_rc text NOT NULL,
    tercero_interno text NOT NULL,
    nit_generico text DEFAULT '999999999'::text NOT NULL,
    nota_identificado text DEFAULT 'Clientes-Pagos'::text NOT NULL,
    nota_por_identificar text DEFAULT 'Pagos por Identificar'::text NOT NULL,
    cta_clientes text NOT NULL,
    cta_por_identificar text NOT NULL,
    ultimo_consecutivo_rc integer DEFAULT 0 NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    prefijo_ce text NOT NULL,
    ultimo_consecutivo_ce integer DEFAULT 0 NOT NULL,
    cta_proveedores text DEFAULT '22050101'::text NOT NULL,
    cta_caja text DEFAULT '11050501'::text NOT NULL,
    nota_proveedores text DEFAULT 'Proveedores-Pagos'::text NOT NULL,
    nota_retiro text DEFAULT 'Retiro de efectivo'::text NOT NULL
);

--
-- Name: reglas_movimiento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reglas_movimiento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_id uuid NOT NULL,
    patron text NOT NULL,
    accion text NOT NULL,
    nit text,
    cta_contable text,
    nota text,
    prioridad integer DEFAULT 100 NOT NULL,
    documento text DEFAULT 'RC'::text NOT NULL,
    CONSTRAINT reglas_movimiento_accion_check CHECK ((accion = ANY (ARRAY['excluir'::text, 'asignar'::text]))),
    CONSTRAINT reglas_movimiento_documento_check CHECK ((documento = ANY (ARRAY['RC'::text, 'CE'::text])))
);

--
-- Name: terceros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terceros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_id uuid NOT NULL,
    nombre text NOT NULL,
    nit text NOT NULL,
    nit_alt text
);

--
-- Name: terceros_alias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terceros_alias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tercero_id uuid NOT NULL,
    alias text NOT NULL
);

--
-- Name: cuentas_bancarias cuentas_bancarias_banco_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT cuentas_bancarias_banco_numero_key UNIQUE (banco, numero);

--
-- Name: cuentas_bancarias cuentas_bancarias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT cuentas_bancarias_pkey PRIMARY KEY (id);

--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);

--
-- Name: reglas_movimiento reglas_movimiento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_movimiento
    ADD CONSTRAINT reglas_movimiento_pkey PRIMARY KEY (id);

--
-- Name: terceros_alias terceros_alias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terceros_alias
    ADD CONSTRAINT terceros_alias_pkey PRIMARY KEY (id);

--
-- Name: terceros_alias terceros_alias_tercero_id_alias_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terceros_alias
    ADD CONSTRAINT terceros_alias_tercero_id_alias_key UNIQUE (tercero_id, alias);

--
-- Name: terceros terceros_empresa_id_nit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terceros
    ADD CONSTRAINT terceros_empresa_id_nit_key UNIQUE (empresa_id, nit);

--
-- Name: terceros terceros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terceros
    ADD CONSTRAINT terceros_pkey PRIMARY KEY (id);

--
-- Name: cuentas_bancarias cuentas_bancarias_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT cuentas_bancarias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

--
-- Name: reglas_movimiento reglas_movimiento_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reglas_movimiento
    ADD CONSTRAINT reglas_movimiento_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

--
-- Name: terceros_alias terceros_alias_tercero_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terceros_alias
    ADD CONSTRAINT terceros_alias_tercero_id_fkey FOREIGN KEY (tercero_id) REFERENCES public.terceros(id) ON DELETE CASCADE;

--
-- Name: terceros terceros_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terceros
    ADD CONSTRAINT terceros_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

\unrestrict qrgLnzXUMwqns6yOKP9PXRC2Wm0XGTIdxs1YYzbzCUC4xrUbEHwXUzeG29x5c26


-- La API pública de InsForge (anon/authenticated) no ve estas tablas hasta que haya políticas.
alter table public.empresas enable row level security;
alter table public.cuentas_bancarias enable row level security;
alter table public.terceros enable row level security;
alter table public.terceros_alias enable row level security;
alter table public.reglas_movimiento enable row level security;
