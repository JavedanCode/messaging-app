function AuthInput({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-white/75"
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/4 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-indigo-400/60 focus:bg-white/6 focus:ring-2 focus:ring-indigo-400/10"
      />
    </div>
  );
}

export default AuthInput;
