import { businessDate, businessTime } from "@zenops/contracts/time";
import { type FormEvent, useEffect, useState } from "react";
import { BusinessDateTimeField } from "./BusinessDateTimeField";

type AvailableTrip = { id: string; startAt: string; endAt: string; vehicleCode: string; registrationNumber: string; driverName: string };

export function VehicleTripForm({ workDayId, vehicles, employees, employeeId, saving, onDriverSubmit, onPassengerSubmit, onClose }: {
  workDayId: string; vehicles: Array<{id:string;code:string;registrationNumber:string}>;
  employees: Array<{id:string;displayName:string}>; employeeId: string; saving: boolean;
  onDriverSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onPassengerSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onClose: () => void;
}) {
  const [driver, setDriver] = useState(false);
  const [trips, setTrips] = useState<AvailableTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (driver) return;
    const controller = new AbortController();
    setTrips([]); setLoading(true); setMessage("");
    void fetch(`/api/workdays/${workDayId}/vehicle-trips/available`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = await response.json() as {trips:AvailableTrip[]};
        if (!controller.signal.aborted) setTrips(body.trips);
      })
      .catch(() => { if (!controller.signal.aborted) setMessage("Jízdy se nepodařilo načíst. Zkuste seznam obnovit."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [driver, workDayId, refresh]);

  return <div className="workday-forms"><div className="vehicle-role-panel">
    <h4>Společná jízda vozidlem</h4>
    <label className="vehicle-driver-choice"><input type="checkbox" checked={driver} disabled={saving}
      onChange={(event) => setDriver(event.target.checked)} />Jsem řidič této jízdy</label>
    <p className="form-hint">{driver ? "Jízdu zakládáte jako její jediný řidič. Kilometry a palivo zadáte jednou za toto vozidlo."
      : "Jako cestující se připojíte k jízdě řidiče. Kilometry ani palivo znovu nezapisujete."}</p>
    {driver ? <form key="driver" className="vehicle-trip-form" onSubmit={onDriverSubmit}>
      <label>Vyberte vozidlo<select name="vehicleId" required defaultValue=""><option value="" disabled>Zvolte vozidlo</option>
        {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.registrationNumber}</option>)}</select></label>
      <BusinessDateTimeField name="startAt" label="Začátek jízdy" /><BusinessDateTimeField name="endAt" label="Konec jízdy" />
      <label>Stav tachometru před jízdou (km)<input name="startOdometerKm" type="number" min="0" step="0.1" required /></label>
      <label>Stav tachometru po jízdě (km)<input name="endOdometerKm" type="number" min="0" step="0.1" required /></label>
      <label>Spotřebované palivo (l)<input name="fuelConsumed" type="number" min="0" max="100000" step="0.01" /></label>
      <label>Natankované palivo (l)<input name="fuelRefuelled" type="number" min="0" max="100000" step="0.01" /></label>
      {employees.length > 0 && <fieldset className="worker-passengers"><legend>Cestující (nepovinné)</legend>
        {employees.filter((employee) => employee.id !== employeeId).map((employee) => <label className="checkbox" key={employee.id}>
          <input type="checkbox" name="passengerEmployeeIds" value={employee.id} />{employee.displayName}</label>)}
        <small>Můžete označit cestující rovnou, nebo se sami připojí k založené jízdě.</small></fieldset>}
      <label>Poznámka (nepovinná)<input name="note" maxLength={1000} /></label>
      <button disabled={saving}>{saving ? "Ukládám…" : "Uložit jízdu"}</button>
    </form> : <form key={`passenger-${refresh}`} className="passenger-trip-form" onSubmit={onPassengerSubmit}>
      {message && <p className="error" role="alert">{message}</p>}
      {loading ? <p role="status">Načítám společné jízdy…</p> : trips.length === 0
        ? <p className="form-hint">Žádná další upravitelná jízda pro tento den není dostupná. Řidič ji musí nejprve založit.
          Po odeslání dne řeší změny cestujících Admin.</p>
        : <label>Jízda, ve které jste cestoval(a)<select name="tripId" required defaultValue="" disabled={saving}>
          <option value="" disabled>Vyberte vozidlo a řidiče</option>
          {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.vehicleCode} · {trip.registrationNumber} · {trip.driverName}
            {" · "}{businessDate(trip.startAt)} {businessTime(trip.startAt)}–{businessTime(trip.endAt)}</option>)}</select></label>}
      <button type="button" className="ghost" disabled={saving || loading} onClick={() => setRefresh((value) => value + 1)}>Obnovit seznam jízd</button>
      <button disabled={saving || loading || trips.length === 0}>{saving ? "Připojuji…" : "Připojit se jako cestující"}</button>
    </form>}
    <button type="button" className="ghost" disabled={saving} onClick={onClose}>Zrušit</button>
  </div></div>;
}
