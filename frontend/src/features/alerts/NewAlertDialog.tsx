import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/http';
import type { AlertCondition } from '../../shared/api/types';
import { useFormat } from '../../shared/format/useFormat';
import { errorText, issueText } from '../../shared/i18n/errorText';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { Button } from '../../shared/ui/Button';
import { FormField } from '../../shared/ui/FormField';
import type { Issue } from '../../shared/validation/rules';
import { parseTarget, toInputText } from './lib/target';
import { useCreateAlert } from './useAlerts';

const CONDITIONS: AlertCondition[] = ['ABOVE', 'BELOW'];

/**
 * "New alert" dialog of the /alerts page (AC-ALERT-12). The symbol is typed and checked against the market list
 * (translated error), the rest follows the alert form of the Alerts tab (AC-ALERT-02).
 */
export function NewAlertDialog({ defaultSymbol, onClose }: { defaultSymbol: string; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const symbols = useSymbols();
  const tickers = useTickers();
  const create = useCreateAlert();
  const [symbolText, setSymbolText] = useState(defaultSymbol);
  const [condition, setCondition] = useState<AlertCondition>('ABOVE');
  const [typed, setTyped] = useState<string | null>(null);
  const [symbolError, setSymbolError] = useState<string | undefined>();
  const [issue, setIssue] = useState<Issue | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();

  useEffect(() => {
    document.getElementById('dialogSymbol')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const symbol = symbolText.trim().toUpperCase();
  const info = useMemo(() => symbols.data?.find((s) => s.symbol === symbol), [symbols.data, symbol]);
  const lastPrice = useMemo(() => tickers.data?.find((x) => x.symbol === symbol)?.lastPrice, [tickers.data, symbol]);
  const target = typed ?? (lastPrice === undefined ? '' : toInputText(lastPrice));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setServerError(undefined);
    if (!info) {
      setSymbolError(t('errors.SYMBOL_NOT_FOUND'));
      return;
    }
    setSymbolError(undefined);
    const parsed = parseTarget(target);
    setIssue(parsed.issue);
    if (parsed.issue) return;
    create.mutate(
      { symbol, condition, targetPrice: parsed.value },
      {
        onSuccess: onClose,
        onError: (err) => {
          const field = err instanceof ApiError ? err.details?.find((d) => d.field === 'targetPrice') : undefined;
          if (field) setIssue(field);
          else setServerError(errorText(t, err));
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="alerts-dialog-title"
        data-testid="alerts-dialog"
        noValidate
        onSubmit={onSubmit}
        className="flex w-full max-w-md flex-col gap-4 rounded-card border border-border bg-surface p-6"
      >
        <h2 id="alerts-dialog-title" className="text-page font-semibold">
          {t('alertsPage.dialog.title')}
        </h2>
        <FormField
          name="dialogSymbol"
          label={t('alerts.form.symbol')}
          autoComplete="off"
          autoCapitalize="characters"
          value={symbolText}
          error={symbolError}
          onChange={(e) => {
            setSymbolText(e.target.value);
            setTyped(null);
            setSymbolError(undefined);
            setServerError(undefined);
          }}
        />
        <div className="flex flex-col gap-1">
          <span id="dialog-condition-label" className="text-meta font-medium text-text-muted">
            {t('alerts.form.condition')}
          </span>
          <div role="radiogroup" aria-labelledby="dialog-condition-label" className="flex gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={condition === c}
                data-testid={`dialog-condition-${c.toLowerCase()}`}
                onClick={() => {
                  setCondition(c);
                  setServerError(undefined);
                }}
                className={`h-8 rounded-button border px-3 text-body ${condition === c ? 'border-accent bg-surface-2 text-text' : 'border-border bg-surface-2 text-text-muted hover:text-text'}`}
              >
                {t(`alertsPage.dialog.${c}`)}
              </button>
            ))}
          </div>
        </div>
        <FormField
          name="dialogTarget"
          label={t('alertsPage.dialog.target')}
          inputMode="decimal"
          autoComplete="off"
          value={target}
          error={issueText(t, issue)}
          onChange={(e) => {
            setTyped(e.target.value);
            setIssue(undefined);
            setServerError(undefined);
          }}
        />
        {info && lastPrice !== undefined && (
          <p data-testid="dialog-current-price" className="font-mono text-meta text-text-muted">
            {t('alertsPage.dialog.current', { price: fmt.price(lastPrice, info.pricePrecision) })}
          </p>
        )}
        {serverError && (
          <p data-testid="dialog-error" role="alert" className="text-meta text-danger">
            {serverError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" data-testid="dialog-cancel" onClick={onClose}>
            {t('alertsPage.dialog.cancel')}
          </Button>
          <Button type="submit" data-testid="dialog-submit" disabled={create.isPending}>
            {t('alerts.form.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
