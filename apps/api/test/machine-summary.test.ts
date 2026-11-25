import { describe, expect, it } from "vitest";
import { summarizeMachines } from "../src/machine-summary.js";
import type { MachineUsageSummary } from "@zenops/contracts";

const usage: MachineUsageSummary = {id:"usage1",machineId:"m1",machineCode:"TR-01",machineName:"Traktor",startMth:"100.10",endMth:"100.20",fuelConsumed:"0.10",fuelRefuelled:null,attachments:["MUL-01"],attachmentIds:["a1"],note:"Porucha"};
const entry = {id:"entry1",employeeId:"e1",employeeName:"Jan",projectCode:"P1",projectName:"Zakázka",startAt:"2026-11-25T07:00:00Z",endAt:"2026-11-25T08:00:00Z",entryState:"DRAFT",machineUsages:[usage]};

describe("daily machine totals",()=>{
  it("sums meter differences exactly and retains each operator, attachment and note",()=>{
    const result=summarizeMachines([entry,{...entry,id:"entry2",employeeId:"e2",machineUsages:[{...usage,id:"usage2",startMth:"100.20",endMth:"100.40",fuelConsumed:"0.20",fuelRefuelled:"0.00"}]}]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({mth:"0.30",fuelConsumed:"0.30",fuelRefuelled:"0.00",measuredUsages:2});
    expect(result[0]!.usages.map(item=>item.employeeId)).toEqual(["e1","e2"]);
    expect(result[0]!.usages[0]).toMatchObject({note:"Porucha",attachments:["MUL-01"]});
  });
  it("deduplicates physical usage IDs and distinguishes unknown readings/fuel from zero",()=>{
    const unknown={...usage,id:"usage3",machineId:"m2",startMth:null,endMth:null,fuelConsumed:null};
    const result=summarizeMachines([entry,entry,{...entry,machineUsages:[unknown]}]);
    expect(result[0]).toMatchObject({mth:"0.10",measuredUsages:1});
    expect(result[0]!.usages).toHaveLength(1);
    expect(result[1]).toMatchObject({mth:null,measuredUsages:0,fuelConsumed:null,fuelRefuelled:null});
    expect(summarizeMachines([])).toEqual([]);
  });
});
