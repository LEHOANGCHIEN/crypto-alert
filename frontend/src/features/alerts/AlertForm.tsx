import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/http';
import type { AlertCondition } from '../../shared/api/types';
import { errorText, issueText } from '../../shared/i18n/errorText';
import { useSymbols, useTickers } from '../../shared/market/queries';
import { Button } from '../../shared/ui/Button';
import { FormField } from '../../shared/ui/FormField';
import type { Issue } from '../../shared/validation/rules';
import { parseTarget, toInputText } from './lib/target';
import { useCreateAlert } from './useAlerts';

const CONDITIONS: AlertCondition[] = ['ABOVE', 'BELOW'];
const SELECT_CLASS = 'h-8 rounded-input border border-border bg-surface-2 px-3 text-body text-text';

/**
 * Create-alert form (AC-ALERT-01/02): prefilled with the chart symbol, "Above" and the current price.
 * Remounted (key) when the chart symbol changes, so the prefill follows the chart.
 */
export function AlertForm({ chartSymbol }: { chartSymbol: string }) {
  const { t } = useTranslation();
  const symbols = useSymbols();
  const tickers = useTickers();
  const create = useCreateAlert();
  const [symbol, setSymbol] = useState(chartSymbol);
  const [condition, setCondition] = useState<AlertCondition>('ABOVE');
  // null = not edited: the field shows the live current price of the selected symbol.
  const [typed, setTyped] = useState<string | null>(null);
  const [issue, setIssue] = useState<Issue | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();

  const lastPrice = useMemo(() => tickers.data?.find((x) => x.symbol === symbol)?.lastPrice, [tickers.data, symbol]);
  const target = typed ?? (lastPrice === undefined ? '' : toInputText(lastPrice));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setServerError(undefined);
    const parsed = parseTarget(target);
    setIssue(parsed.issue);
    if (parsed.issue) return;
    create.mutate(
      { symbol, condition, targetPrice: parsed.value },
      {
        onSuccess: () => setTyped(null),
        onError: (err) => {
          const field = err instanceof ApiError ? err.details?.find((d) => d.field === 'targetPrice') : undefined;
          if (field) setIssue(field);
          else setServerError(errorText(t, err));
        },
      },
    );
  };

  return (
    <form data-testid="alert-form" noValidate onSubmit={onSubmit} aria-label={t('alerts.form.title')} className="flex flex-col gap-3 border-b border-border p-3">
      <h3 className="text-section font-semibold">{t('alerts.form.title')}</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="alert-symbol" className="text-meta font-medium text-text-muted">
            {t('alerts.form.symbol')}
          </label>
          <select
            id="alert-symbol"
            data-testid="alert-symbol"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              setTyped(null);
              setIssue(undefined);
              setServerError(undefined);
            }}
            className={SELECT_CLASS}
          >
            {!symbols.data?.some((s) => s.symbol === symbol) && <option value={symbol}>{symbol}</option>}
            {(symbols.data ?? []).map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="alert-condition" className="text-meta font-medium text-text-muted">
            {t('alerts.form.condition')}
          </label>
          <select
            id="alert-condition"
            data-testid="alert-condition"
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value as AlertCondition);
              setServerError(undefined);
            }}
            className={SELECT_CLASS}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {t(`alerts.condition.${c}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <FormField
        name="targetPrice"
        label={t('fields.targetPrice')}
        inputMode="decimal"
        autoComplete="off"
        value={target}
        error={issueText(t, issue)}
        onChange={(e) => {
          setTyped(e.target.value);
          setIssue(undefined);
          setServerError(undefined);
        }}
        onBlur={() => setIssue(parseTarget(target).issue)}
      />
      {serverError && (
        <p data-testid="alert-form-error" role="alert" className="text-meta text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" data-testid="alert-submit" disabled={create.isPending}>
        {t('alerts.form.submit')}
      </Button>
    </form>
  );
}
