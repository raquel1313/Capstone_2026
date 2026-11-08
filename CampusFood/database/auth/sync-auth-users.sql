CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  student_role_id INTEGER;
BEGIN
  SELECT id_rol
  INTO student_role_id
  FROM public.roles
  WHERE nombre = 'student';

  IF student_role_id IS NULL THEN
    RAISE EXCEPTION 'Role student does not exist';
  END IF;

  INSERT INTO public.usuarios (
    id_usuario,
    nombre,
    apellido
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'nombre',
    NEW.raw_user_meta_data ->> 'apellido'
  );

  INSERT INTO public.usuario_rol (
    id_usuario,
    id_rol
  )
  VALUES (
    NEW.id,
    student_role_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();