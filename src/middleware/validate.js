export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(result.error);
    }

    // Replace the raw request body with Zod's parsed output so downstream
    // handlers receive normalized and validated data.
    req.body = result.data;

    return next();
  };
}
