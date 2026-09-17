import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { Accessory, AuditLogEntry, AuthResponse, ContractorCompany, CreateAccessoryBody, CreateContractorCompanyBody, CreateFellingRecordBody, CreateMachineBody, CreateMowingRecordBody, CreateRegionBody, CreateUserBody, CreateVehicleBody, CreateWeatherTypeBody, CreateWorkerBody, DashboardStats, ErrorResponse, FellingRecord, HealthStatus, ListAuditLogsParams, ListFellingRecordsParams, ListMowingRecordsParams, ListSubcontractorDailyRecordsParams, LoginBody, Machine, MachineLastMth, MessageResponse, MowingRecord, RecentRecords, Region, SubcontractorDailyRecord, UpdateFellingRecordBody, UpdateMowingRecordBody, UpdateUserBody, UpsertSubcontractorDailyRecordBody, User, Vehicle, WeatherType, Worker } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Přihlášení uživatele
 */
export declare const getLoginUrl: () => string;
export declare const login: (loginBody: LoginBody, options?: RequestInit) => Promise<AuthResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginBody>;
export type LoginMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Přihlášení uživatele
 */
export declare const useLogin: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
/**
 * @summary Odhlášení uživatele
 */
export declare const getLogoutUrl: () => string;
export declare const logout: (options?: RequestInit) => Promise<MessageResponse>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationError = ErrorType<unknown>;
/**
 * @summary Odhlášení uživatele
 */
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
/**
 * @summary Získat aktuálního uživatele
 */
export declare const getGetMeUrl: () => string;
export declare const getMe: (options?: RequestInit) => Promise<User>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Získat aktuálního uživatele
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Seznam uživatelů (pouze admin)
 */
export declare const getListUsersUrl: () => string;
export declare const listUsers: (options?: RequestInit) => Promise<User[]>;
export declare const getListUsersQueryKey: () => readonly ["/api/users"];
export declare const getListUsersQueryOptions: <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>;
export type ListUsersQueryError = ErrorType<unknown>;
/**
 * @summary Seznam uživatelů (pouze admin)
 */
export declare function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit uživatele (pouze admin)
 */
export declare const getCreateUserUrl: () => string;
export declare const createUser: (createUserBody: CreateUserBody, options?: RequestInit) => Promise<User>;
export declare const getCreateUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<CreateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<CreateUserBody>;
}, TContext>;
export type CreateUserMutationResult = NonNullable<Awaited<ReturnType<typeof createUser>>>;
export type CreateUserMutationBody = BodyType<CreateUserBody>;
export type CreateUserMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit uživatele (pouze admin)
 */
export declare const useCreateUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<CreateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<CreateUserBody>;
}, TContext>;
/**
 * @summary Získat uživatele
 */
export declare const getGetUserUrl: (id: number) => string;
export declare const getUser: (id: number, options?: RequestInit) => Promise<User>;
export declare const getGetUserQueryKey: (id: number) => readonly [`/api/users/${number}`];
export declare const getGetUserQueryOptions: <TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserQueryResult = NonNullable<Awaited<ReturnType<typeof getUser>>>;
export type GetUserQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Získat uživatele
 */
export declare function useGetUser<TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Upravit uživatele
 */
export declare const getUpdateUserUrl: (id: number) => string;
export declare const updateUser: (id: number, updateUserBody: UpdateUserBody, options?: RequestInit) => Promise<User>;
export declare const getUpdateUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
export type UpdateUserMutationResult = NonNullable<Awaited<ReturnType<typeof updateUser>>>;
export type UpdateUserMutationBody = BodyType<UpdateUserBody>;
export type UpdateUserMutationError = ErrorType<unknown>;
/**
 * @summary Upravit uživatele
 */
export declare const useUpdateUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
/**
 * @summary Smazat uživatele (soft delete)
 */
export declare const getDeleteUserUrl: (id: number) => string;
export declare const deleteUser: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
    id: number;
}, TContext>;
export type DeleteUserMutationResult = NonNullable<Awaited<ReturnType<typeof deleteUser>>>;
export type DeleteUserMutationError = ErrorType<unknown>;
/**
 * @summary Smazat uživatele (soft delete)
 */
export declare const useDeleteUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteUser>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam pracovníků
 */
export declare const getListWorkersUrl: () => string;
export declare const listWorkers: (options?: RequestInit) => Promise<Worker[]>;
export declare const getListWorkersQueryKey: () => readonly ["/api/workers"];
export declare const getListWorkersQueryOptions: <TData = Awaited<ReturnType<typeof listWorkers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listWorkers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListWorkersQueryResult = NonNullable<Awaited<ReturnType<typeof listWorkers>>>;
export type ListWorkersQueryError = ErrorType<unknown>;
/**
 * @summary Seznam pracovníků
 */
export declare function useListWorkers<TData = Awaited<ReturnType<typeof listWorkers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit pracovníka
 */
export declare const getCreateWorkerUrl: () => string;
export declare const createWorker: (createWorkerBody: CreateWorkerBody, options?: RequestInit) => Promise<Worker>;
export declare const getCreateWorkerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorker>>, TError, {
        data: BodyType<CreateWorkerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createWorker>>, TError, {
    data: BodyType<CreateWorkerBody>;
}, TContext>;
export type CreateWorkerMutationResult = NonNullable<Awaited<ReturnType<typeof createWorker>>>;
export type CreateWorkerMutationBody = BodyType<CreateWorkerBody>;
export type CreateWorkerMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit pracovníka
 */
export declare const useCreateWorker: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorker>>, TError, {
        data: BodyType<CreateWorkerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createWorker>>, TError, {
    data: BodyType<CreateWorkerBody>;
}, TContext>;
/**
 * @summary Upravit pracovníka
 */
export declare const getUpdateWorkerUrl: (id: number) => string;
export declare const updateWorker: (id: number, createWorkerBody: CreateWorkerBody, options?: RequestInit) => Promise<Worker>;
export declare const getUpdateWorkerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWorker>>, TError, {
        id: number;
        data: BodyType<CreateWorkerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateWorker>>, TError, {
    id: number;
    data: BodyType<CreateWorkerBody>;
}, TContext>;
export type UpdateWorkerMutationResult = NonNullable<Awaited<ReturnType<typeof updateWorker>>>;
export type UpdateWorkerMutationBody = BodyType<CreateWorkerBody>;
export type UpdateWorkerMutationError = ErrorType<unknown>;
/**
 * @summary Upravit pracovníka
 */
export declare const useUpdateWorker: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWorker>>, TError, {
        id: number;
        data: BodyType<CreateWorkerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateWorker>>, TError, {
    id: number;
    data: BodyType<CreateWorkerBody>;
}, TContext>;
/**
 * @summary Smazat pracovníka
 */
export declare const getDeleteWorkerUrl: (id: number) => string;
export declare const deleteWorker: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteWorkerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorker>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteWorker>>, TError, {
    id: number;
}, TContext>;
export type DeleteWorkerMutationResult = NonNullable<Awaited<ReturnType<typeof deleteWorker>>>;
export type DeleteWorkerMutationError = ErrorType<unknown>;
/**
 * @summary Smazat pracovníka
 */
export declare const useDeleteWorker: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorker>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteWorker>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam subdodavatelských firem
 */
export declare const getListContractorCompaniesUrl: () => string;
export declare const listContractorCompanies: (options?: RequestInit) => Promise<ContractorCompany[]>;
export declare const getListContractorCompaniesQueryKey: () => readonly ["/api/contractor-companies"];
export declare const getListContractorCompaniesQueryOptions: <TData = Awaited<ReturnType<typeof listContractorCompanies>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listContractorCompanies>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listContractorCompanies>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListContractorCompaniesQueryResult = NonNullable<Awaited<ReturnType<typeof listContractorCompanies>>>;
export type ListContractorCompaniesQueryError = ErrorType<unknown>;
/**
 * @summary Seznam subdodavatelských firem
 */
export declare function useListContractorCompanies<TData = Awaited<ReturnType<typeof listContractorCompanies>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listContractorCompanies>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit subdodavatelskou firmu
 */
export declare const getCreateContractorCompanyUrl: () => string;
export declare const createContractorCompany: (createContractorCompanyBody: CreateContractorCompanyBody, options?: RequestInit) => Promise<ContractorCompany>;
export declare const getCreateContractorCompanyMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createContractorCompany>>, TError, {
        data: BodyType<CreateContractorCompanyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createContractorCompany>>, TError, {
    data: BodyType<CreateContractorCompanyBody>;
}, TContext>;
export type CreateContractorCompanyMutationResult = NonNullable<Awaited<ReturnType<typeof createContractorCompany>>>;
export type CreateContractorCompanyMutationBody = BodyType<CreateContractorCompanyBody>;
export type CreateContractorCompanyMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit subdodavatelskou firmu
 */
export declare const useCreateContractorCompany: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createContractorCompany>>, TError, {
        data: BodyType<CreateContractorCompanyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createContractorCompany>>, TError, {
    data: BodyType<CreateContractorCompanyBody>;
}, TContext>;
/**
 * @summary Upravit subdodavatelskou firmu
 */
export declare const getUpdateContractorCompanyUrl: (id: number) => string;
export declare const updateContractorCompany: (id: number, createContractorCompanyBody: CreateContractorCompanyBody, options?: RequestInit) => Promise<ContractorCompany>;
export declare const getUpdateContractorCompanyMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateContractorCompany>>, TError, {
        id: number;
        data: BodyType<CreateContractorCompanyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateContractorCompany>>, TError, {
    id: number;
    data: BodyType<CreateContractorCompanyBody>;
}, TContext>;
export type UpdateContractorCompanyMutationResult = NonNullable<Awaited<ReturnType<typeof updateContractorCompany>>>;
export type UpdateContractorCompanyMutationBody = BodyType<CreateContractorCompanyBody>;
export type UpdateContractorCompanyMutationError = ErrorType<unknown>;
/**
 * @summary Upravit subdodavatelskou firmu
 */
export declare const useUpdateContractorCompany: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateContractorCompany>>, TError, {
        id: number;
        data: BodyType<CreateContractorCompanyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateContractorCompany>>, TError, {
    id: number;
    data: BodyType<CreateContractorCompanyBody>;
}, TContext>;
/**
 * @summary Smazat subdodavatelskou firmu
 */
export declare const getDeleteContractorCompanyUrl: (id: number) => string;
export declare const deleteContractorCompany: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteContractorCompanyMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteContractorCompany>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteContractorCompany>>, TError, {
    id: number;
}, TContext>;
export type DeleteContractorCompanyMutationResult = NonNullable<Awaited<ReturnType<typeof deleteContractorCompany>>>;
export type DeleteContractorCompanyMutationError = ErrorType<unknown>;
/**
 * @summary Smazat subdodavatelskou firmu
 */
export declare const useDeleteContractorCompany: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteContractorCompany>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteContractorCompany>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam vozidel
 */
export declare const getListVehiclesUrl: () => string;
export declare const listVehicles: (options?: RequestInit) => Promise<Vehicle[]>;
export declare const getListVehiclesQueryKey: () => readonly ["/api/vehicles"];
export declare const getListVehiclesQueryOptions: <TData = Awaited<ReturnType<typeof listVehicles>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVehicles>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listVehicles>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListVehiclesQueryResult = NonNullable<Awaited<ReturnType<typeof listVehicles>>>;
export type ListVehiclesQueryError = ErrorType<unknown>;
/**
 * @summary Seznam vozidel
 */
export declare function useListVehicles<TData = Awaited<ReturnType<typeof listVehicles>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVehicles>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit vozidlo
 */
export declare const getCreateVehicleUrl: () => string;
export declare const createVehicle: (createVehicleBody: CreateVehicleBody, options?: RequestInit) => Promise<Vehicle>;
export declare const getCreateVehicleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createVehicle>>, TError, {
        data: BodyType<CreateVehicleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createVehicle>>, TError, {
    data: BodyType<CreateVehicleBody>;
}, TContext>;
export type CreateVehicleMutationResult = NonNullable<Awaited<ReturnType<typeof createVehicle>>>;
export type CreateVehicleMutationBody = BodyType<CreateVehicleBody>;
export type CreateVehicleMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit vozidlo
 */
export declare const useCreateVehicle: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createVehicle>>, TError, {
        data: BodyType<CreateVehicleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createVehicle>>, TError, {
    data: BodyType<CreateVehicleBody>;
}, TContext>;
/**
 * @summary Upravit vozidlo
 */
export declare const getUpdateVehicleUrl: (id: number) => string;
export declare const updateVehicle: (id: number, createVehicleBody: CreateVehicleBody, options?: RequestInit) => Promise<Vehicle>;
export declare const getUpdateVehicleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateVehicle>>, TError, {
        id: number;
        data: BodyType<CreateVehicleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateVehicle>>, TError, {
    id: number;
    data: BodyType<CreateVehicleBody>;
}, TContext>;
export type UpdateVehicleMutationResult = NonNullable<Awaited<ReturnType<typeof updateVehicle>>>;
export type UpdateVehicleMutationBody = BodyType<CreateVehicleBody>;
export type UpdateVehicleMutationError = ErrorType<unknown>;
/**
 * @summary Upravit vozidlo
 */
export declare const useUpdateVehicle: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateVehicle>>, TError, {
        id: number;
        data: BodyType<CreateVehicleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateVehicle>>, TError, {
    id: number;
    data: BodyType<CreateVehicleBody>;
}, TContext>;
/**
 * @summary Smazat vozidlo
 */
export declare const getDeleteVehicleUrl: (id: number) => string;
export declare const deleteVehicle: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteVehicleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteVehicle>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteVehicle>>, TError, {
    id: number;
}, TContext>;
export type DeleteVehicleMutationResult = NonNullable<Awaited<ReturnType<typeof deleteVehicle>>>;
export type DeleteVehicleMutationError = ErrorType<unknown>;
/**
 * @summary Smazat vozidlo
 */
export declare const useDeleteVehicle: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteVehicle>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteVehicle>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam strojů
 */
export declare const getListMachinesUrl: () => string;
export declare const listMachines: (options?: RequestInit) => Promise<Machine[]>;
export declare const getListMachinesQueryKey: () => readonly ["/api/machines"];
export declare const getListMachinesQueryOptions: <TData = Awaited<ReturnType<typeof listMachines>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMachines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMachines>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMachinesQueryResult = NonNullable<Awaited<ReturnType<typeof listMachines>>>;
export type ListMachinesQueryError = ErrorType<unknown>;
/**
 * @summary Seznam strojů
 */
export declare function useListMachines<TData = Awaited<ReturnType<typeof listMachines>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMachines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit stroj
 */
export declare const getCreateMachineUrl: () => string;
export declare const createMachine: (createMachineBody: CreateMachineBody, options?: RequestInit) => Promise<Machine>;
export declare const getCreateMachineMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMachine>>, TError, {
        data: BodyType<CreateMachineBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMachine>>, TError, {
    data: BodyType<CreateMachineBody>;
}, TContext>;
export type CreateMachineMutationResult = NonNullable<Awaited<ReturnType<typeof createMachine>>>;
export type CreateMachineMutationBody = BodyType<CreateMachineBody>;
export type CreateMachineMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit stroj
 */
export declare const useCreateMachine: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMachine>>, TError, {
        data: BodyType<CreateMachineBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMachine>>, TError, {
    data: BodyType<CreateMachineBody>;
}, TContext>;
/**
 * @summary Upravit stroj
 */
export declare const getUpdateMachineUrl: (id: number) => string;
export declare const updateMachine: (id: number, createMachineBody: CreateMachineBody, options?: RequestInit) => Promise<Machine>;
export declare const getUpdateMachineMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMachine>>, TError, {
        id: number;
        data: BodyType<CreateMachineBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMachine>>, TError, {
    id: number;
    data: BodyType<CreateMachineBody>;
}, TContext>;
export type UpdateMachineMutationResult = NonNullable<Awaited<ReturnType<typeof updateMachine>>>;
export type UpdateMachineMutationBody = BodyType<CreateMachineBody>;
export type UpdateMachineMutationError = ErrorType<unknown>;
/**
 * @summary Upravit stroj
 */
export declare const useUpdateMachine: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMachine>>, TError, {
        id: number;
        data: BodyType<CreateMachineBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMachine>>, TError, {
    id: number;
    data: BodyType<CreateMachineBody>;
}, TContext>;
/**
 * @summary Smazat stroj
 */
export declare const getDeleteMachineUrl: (id: number) => string;
export declare const deleteMachine: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteMachineMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMachine>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteMachine>>, TError, {
    id: number;
}, TContext>;
export type DeleteMachineMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMachine>>>;
export type DeleteMachineMutationError = ErrorType<unknown>;
/**
 * @summary Smazat stroj
 */
export declare const useDeleteMachine: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMachine>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteMachine>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Poslední koncový stav MTH stroje
 */
export declare const getGetMachineLastMthUrl: (id: number) => string;
export declare const getMachineLastMth: (id: number, options?: RequestInit) => Promise<MachineLastMth>;
export declare const getGetMachineLastMthQueryKey: (id: number) => readonly [`/api/machines/${number}/last-mth`];
export declare const getGetMachineLastMthQueryOptions: <TData = Awaited<ReturnType<typeof getMachineLastMth>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMachineLastMth>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMachineLastMth>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMachineLastMthQueryResult = NonNullable<Awaited<ReturnType<typeof getMachineLastMth>>>;
export type GetMachineLastMthQueryError = ErrorType<unknown>;
/**
 * @summary Poslední koncový stav MTH stroje
 */
export declare function useGetMachineLastMth<TData = Awaited<ReturnType<typeof getMachineLastMth>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMachineLastMth>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Seznam příslušenství
 */
export declare const getListAccessoriesUrl: () => string;
export declare const listAccessories: (options?: RequestInit) => Promise<Accessory[]>;
export declare const getListAccessoriesQueryKey: () => readonly ["/api/accessories"];
export declare const getListAccessoriesQueryOptions: <TData = Awaited<ReturnType<typeof listAccessories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAccessories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAccessories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAccessoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listAccessories>>>;
export type ListAccessoriesQueryError = ErrorType<unknown>;
/**
 * @summary Seznam příslušenství
 */
export declare function useListAccessories<TData = Awaited<ReturnType<typeof listAccessories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAccessories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit příslušenství
 */
export declare const getCreateAccessoryUrl: () => string;
export declare const createAccessory: (createAccessoryBody: CreateAccessoryBody, options?: RequestInit) => Promise<Accessory>;
export declare const getCreateAccessoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccessory>>, TError, {
        data: BodyType<CreateAccessoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAccessory>>, TError, {
    data: BodyType<CreateAccessoryBody>;
}, TContext>;
export type CreateAccessoryMutationResult = NonNullable<Awaited<ReturnType<typeof createAccessory>>>;
export type CreateAccessoryMutationBody = BodyType<CreateAccessoryBody>;
export type CreateAccessoryMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit příslušenství
 */
export declare const useCreateAccessory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccessory>>, TError, {
        data: BodyType<CreateAccessoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAccessory>>, TError, {
    data: BodyType<CreateAccessoryBody>;
}, TContext>;
/**
 * @summary Upravit příslušenství
 */
export declare const getUpdateAccessoryUrl: (id: number) => string;
export declare const updateAccessory: (id: number, createAccessoryBody: CreateAccessoryBody, options?: RequestInit) => Promise<Accessory>;
export declare const getUpdateAccessoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAccessory>>, TError, {
        id: number;
        data: BodyType<CreateAccessoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAccessory>>, TError, {
    id: number;
    data: BodyType<CreateAccessoryBody>;
}, TContext>;
export type UpdateAccessoryMutationResult = NonNullable<Awaited<ReturnType<typeof updateAccessory>>>;
export type UpdateAccessoryMutationBody = BodyType<CreateAccessoryBody>;
export type UpdateAccessoryMutationError = ErrorType<unknown>;
/**
 * @summary Upravit příslušenství
 */
export declare const useUpdateAccessory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAccessory>>, TError, {
        id: number;
        data: BodyType<CreateAccessoryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAccessory>>, TError, {
    id: number;
    data: BodyType<CreateAccessoryBody>;
}, TContext>;
/**
 * @summary Smazat příslušenství
 */
export declare const getDeleteAccessoryUrl: (id: number) => string;
export declare const deleteAccessory: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteAccessoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccessory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAccessory>>, TError, {
    id: number;
}, TContext>;
export type DeleteAccessoryMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAccessory>>>;
export type DeleteAccessoryMutationError = ErrorType<unknown>;
/**
 * @summary Smazat příslušenství
 */
export declare const useDeleteAccessory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccessory>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAccessory>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam revírů / oblastí
 */
export declare const getListRegionsUrl: () => string;
export declare const listRegions: (options?: RequestInit) => Promise<Region[]>;
export declare const getListRegionsQueryKey: () => readonly ["/api/regions"];
export declare const getListRegionsQueryOptions: <TData = Awaited<ReturnType<typeof listRegions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRegions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRegions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRegionsQueryResult = NonNullable<Awaited<ReturnType<typeof listRegions>>>;
export type ListRegionsQueryError = ErrorType<unknown>;
/**
 * @summary Seznam revírů / oblastí
 */
export declare function useListRegions<TData = Awaited<ReturnType<typeof listRegions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRegions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit revír
 */
export declare const getCreateRegionUrl: () => string;
export declare const createRegion: (createRegionBody: CreateRegionBody, options?: RequestInit) => Promise<Region>;
export declare const getCreateRegionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRegion>>, TError, {
        data: BodyType<CreateRegionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRegion>>, TError, {
    data: BodyType<CreateRegionBody>;
}, TContext>;
export type CreateRegionMutationResult = NonNullable<Awaited<ReturnType<typeof createRegion>>>;
export type CreateRegionMutationBody = BodyType<CreateRegionBody>;
export type CreateRegionMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit revír
 */
export declare const useCreateRegion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRegion>>, TError, {
        data: BodyType<CreateRegionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRegion>>, TError, {
    data: BodyType<CreateRegionBody>;
}, TContext>;
/**
 * @summary Upravit revír
 */
export declare const getUpdateRegionUrl: (id: number) => string;
export declare const updateRegion: (id: number, createRegionBody: CreateRegionBody, options?: RequestInit) => Promise<Region>;
export declare const getUpdateRegionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRegion>>, TError, {
        id: number;
        data: BodyType<CreateRegionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateRegion>>, TError, {
    id: number;
    data: BodyType<CreateRegionBody>;
}, TContext>;
export type UpdateRegionMutationResult = NonNullable<Awaited<ReturnType<typeof updateRegion>>>;
export type UpdateRegionMutationBody = BodyType<CreateRegionBody>;
export type UpdateRegionMutationError = ErrorType<unknown>;
/**
 * @summary Upravit revír
 */
export declare const useUpdateRegion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRegion>>, TError, {
        id: number;
        data: BodyType<CreateRegionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateRegion>>, TError, {
    id: number;
    data: BodyType<CreateRegionBody>;
}, TContext>;
/**
 * @summary Smazat revír
 */
export declare const getDeleteRegionUrl: (id: number) => string;
export declare const deleteRegion: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteRegionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRegion>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteRegion>>, TError, {
    id: number;
}, TContext>;
export type DeleteRegionMutationResult = NonNullable<Awaited<ReturnType<typeof deleteRegion>>>;
export type DeleteRegionMutationError = ErrorType<unknown>;
/**
 * @summary Smazat revír
 */
export declare const useDeleteRegion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRegion>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteRegion>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam typů počasí
 */
export declare const getListWeatherTypesUrl: () => string;
export declare const listWeatherTypes: (options?: RequestInit) => Promise<WeatherType[]>;
export declare const getListWeatherTypesQueryKey: () => readonly ["/api/weather-types"];
export declare const getListWeatherTypesQueryOptions: <TData = Awaited<ReturnType<typeof listWeatherTypes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWeatherTypes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listWeatherTypes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListWeatherTypesQueryResult = NonNullable<Awaited<ReturnType<typeof listWeatherTypes>>>;
export type ListWeatherTypesQueryError = ErrorType<unknown>;
/**
 * @summary Seznam typů počasí
 */
export declare function useListWeatherTypes<TData = Awaited<ReturnType<typeof listWeatherTypes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWeatherTypes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit typ počasí
 */
export declare const getCreateWeatherTypeUrl: () => string;
export declare const createWeatherType: (createWeatherTypeBody: CreateWeatherTypeBody, options?: RequestInit) => Promise<WeatherType>;
export declare const getCreateWeatherTypeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWeatherType>>, TError, {
        data: BodyType<CreateWeatherTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createWeatherType>>, TError, {
    data: BodyType<CreateWeatherTypeBody>;
}, TContext>;
export type CreateWeatherTypeMutationResult = NonNullable<Awaited<ReturnType<typeof createWeatherType>>>;
export type CreateWeatherTypeMutationBody = BodyType<CreateWeatherTypeBody>;
export type CreateWeatherTypeMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit typ počasí
 */
export declare const useCreateWeatherType: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWeatherType>>, TError, {
        data: BodyType<CreateWeatherTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createWeatherType>>, TError, {
    data: BodyType<CreateWeatherTypeBody>;
}, TContext>;
/**
 * @summary Upravit typ počasí
 */
export declare const getUpdateWeatherTypeUrl: (id: number) => string;
export declare const updateWeatherType: (id: number, createWeatherTypeBody: CreateWeatherTypeBody, options?: RequestInit) => Promise<WeatherType>;
export declare const getUpdateWeatherTypeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWeatherType>>, TError, {
        id: number;
        data: BodyType<CreateWeatherTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateWeatherType>>, TError, {
    id: number;
    data: BodyType<CreateWeatherTypeBody>;
}, TContext>;
export type UpdateWeatherTypeMutationResult = NonNullable<Awaited<ReturnType<typeof updateWeatherType>>>;
export type UpdateWeatherTypeMutationBody = BodyType<CreateWeatherTypeBody>;
export type UpdateWeatherTypeMutationError = ErrorType<unknown>;
/**
 * @summary Upravit typ počasí
 */
export declare const useUpdateWeatherType: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateWeatherType>>, TError, {
        id: number;
        data: BodyType<CreateWeatherTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateWeatherType>>, TError, {
    id: number;
    data: BodyType<CreateWeatherTypeBody>;
}, TContext>;
/**
 * @summary Smazat typ počasí
 */
export declare const getDeleteWeatherTypeUrl: (id: number) => string;
export declare const deleteWeatherType: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteWeatherTypeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWeatherType>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteWeatherType>>, TError, {
    id: number;
}, TContext>;
export type DeleteWeatherTypeMutationResult = NonNullable<Awaited<ReturnType<typeof deleteWeatherType>>>;
export type DeleteWeatherTypeMutationError = ErrorType<unknown>;
/**
 * @summary Smazat typ počasí
 */
export declare const useDeleteWeatherType: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWeatherType>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteWeatherType>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam záznamů kácení
 */
export declare const getListFellingRecordsUrl: (params?: ListFellingRecordsParams) => string;
export declare const listFellingRecords: (params?: ListFellingRecordsParams, options?: RequestInit) => Promise<FellingRecord[]>;
export declare const getListFellingRecordsQueryKey: (params?: ListFellingRecordsParams) => readonly ["/api/felling-records", ...ListFellingRecordsParams[]];
export declare const getListFellingRecordsQueryOptions: <TData = Awaited<ReturnType<typeof listFellingRecords>>, TError = ErrorType<unknown>>(params?: ListFellingRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFellingRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFellingRecords>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFellingRecordsQueryResult = NonNullable<Awaited<ReturnType<typeof listFellingRecords>>>;
export type ListFellingRecordsQueryError = ErrorType<unknown>;
/**
 * @summary Seznam záznamů kácení
 */
export declare function useListFellingRecords<TData = Awaited<ReturnType<typeof listFellingRecords>>, TError = ErrorType<unknown>>(params?: ListFellingRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFellingRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit záznam kácení
 */
export declare const getCreateFellingRecordUrl: () => string;
export declare const createFellingRecord: (createFellingRecordBody: CreateFellingRecordBody, options?: RequestInit) => Promise<FellingRecord>;
export declare const getCreateFellingRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFellingRecord>>, TError, {
        data: BodyType<CreateFellingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createFellingRecord>>, TError, {
    data: BodyType<CreateFellingRecordBody>;
}, TContext>;
export type CreateFellingRecordMutationResult = NonNullable<Awaited<ReturnType<typeof createFellingRecord>>>;
export type CreateFellingRecordMutationBody = BodyType<CreateFellingRecordBody>;
export type CreateFellingRecordMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit záznam kácení
 */
export declare const useCreateFellingRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFellingRecord>>, TError, {
        data: BodyType<CreateFellingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createFellingRecord>>, TError, {
    data: BodyType<CreateFellingRecordBody>;
}, TContext>;
/**
 * @summary Získat záznam kácení
 */
export declare const getGetFellingRecordUrl: (id: number) => string;
export declare const getFellingRecord: (id: number, options?: RequestInit) => Promise<FellingRecord>;
export declare const getGetFellingRecordQueryKey: (id: number) => readonly [`/api/felling-records/${number}`];
export declare const getGetFellingRecordQueryOptions: <TData = Awaited<ReturnType<typeof getFellingRecord>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFellingRecord>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFellingRecord>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFellingRecordQueryResult = NonNullable<Awaited<ReturnType<typeof getFellingRecord>>>;
export type GetFellingRecordQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Získat záznam kácení
 */
export declare function useGetFellingRecord<TData = Awaited<ReturnType<typeof getFellingRecord>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFellingRecord>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Upravit záznam kácení
 */
export declare const getUpdateFellingRecordUrl: (id: number) => string;
export declare const updateFellingRecord: (id: number, updateFellingRecordBody: UpdateFellingRecordBody, options?: RequestInit) => Promise<FellingRecord>;
export declare const getUpdateFellingRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFellingRecord>>, TError, {
        id: number;
        data: BodyType<UpdateFellingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateFellingRecord>>, TError, {
    id: number;
    data: BodyType<UpdateFellingRecordBody>;
}, TContext>;
export type UpdateFellingRecordMutationResult = NonNullable<Awaited<ReturnType<typeof updateFellingRecord>>>;
export type UpdateFellingRecordMutationBody = BodyType<UpdateFellingRecordBody>;
export type UpdateFellingRecordMutationError = ErrorType<unknown>;
/**
 * @summary Upravit záznam kácení
 */
export declare const useUpdateFellingRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFellingRecord>>, TError, {
        id: number;
        data: BodyType<UpdateFellingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateFellingRecord>>, TError, {
    id: number;
    data: BodyType<UpdateFellingRecordBody>;
}, TContext>;
/**
 * @summary Smazat záznam kácení (soft delete)
 */
export declare const getDeleteFellingRecordUrl: (id: number) => string;
export declare const deleteFellingRecord: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteFellingRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFellingRecord>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteFellingRecord>>, TError, {
    id: number;
}, TContext>;
export type DeleteFellingRecordMutationResult = NonNullable<Awaited<ReturnType<typeof deleteFellingRecord>>>;
export type DeleteFellingRecordMutationError = ErrorType<unknown>;
/**
 * @summary Smazat záznam kácení (soft delete)
 */
export declare const useDeleteFellingRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFellingRecord>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteFellingRecord>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Seznam záznamů sečení
 */
export declare const getListMowingRecordsUrl: (params?: ListMowingRecordsParams) => string;
export declare const listMowingRecords: (params?: ListMowingRecordsParams, options?: RequestInit) => Promise<MowingRecord[]>;
export declare const getListMowingRecordsQueryKey: (params?: ListMowingRecordsParams) => readonly ["/api/mowing-records", ...ListMowingRecordsParams[]];
export declare const getListMowingRecordsQueryOptions: <TData = Awaited<ReturnType<typeof listMowingRecords>>, TError = ErrorType<unknown>>(params?: ListMowingRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMowingRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMowingRecords>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMowingRecordsQueryResult = NonNullable<Awaited<ReturnType<typeof listMowingRecords>>>;
export type ListMowingRecordsQueryError = ErrorType<unknown>;
/**
 * @summary Seznam záznamů sečení
 */
export declare function useListMowingRecords<TData = Awaited<ReturnType<typeof listMowingRecords>>, TError = ErrorType<unknown>>(params?: ListMowingRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMowingRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit záznam sečení
 */
export declare const getCreateMowingRecordUrl: () => string;
export declare const createMowingRecord: (createMowingRecordBody: CreateMowingRecordBody, options?: RequestInit) => Promise<MowingRecord>;
export declare const getCreateMowingRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMowingRecord>>, TError, {
        data: BodyType<CreateMowingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMowingRecord>>, TError, {
    data: BodyType<CreateMowingRecordBody>;
}, TContext>;
export type CreateMowingRecordMutationResult = NonNullable<Awaited<ReturnType<typeof createMowingRecord>>>;
export type CreateMowingRecordMutationBody = BodyType<CreateMowingRecordBody>;
export type CreateMowingRecordMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit záznam sečení
 */
export declare const useCreateMowingRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMowingRecord>>, TError, {
        data: BodyType<CreateMowingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMowingRecord>>, TError, {
    data: BodyType<CreateMowingRecordBody>;
}, TContext>;
/**
 * @summary Získat záznam sečení
 */
export declare const getGetMowingRecordUrl: (id: number) => string;
export declare const getMowingRecord: (id: number, options?: RequestInit) => Promise<MowingRecord>;
export declare const getGetMowingRecordQueryKey: (id: number) => readonly [`/api/mowing-records/${number}`];
export declare const getGetMowingRecordQueryOptions: <TData = Awaited<ReturnType<typeof getMowingRecord>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMowingRecord>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMowingRecord>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMowingRecordQueryResult = NonNullable<Awaited<ReturnType<typeof getMowingRecord>>>;
export type GetMowingRecordQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Získat záznam sečení
 */
export declare function useGetMowingRecord<TData = Awaited<ReturnType<typeof getMowingRecord>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMowingRecord>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Upravit záznam sečení
 */
export declare const getUpdateMowingRecordUrl: (id: number) => string;
export declare const updateMowingRecord: (id: number, updateMowingRecordBody: UpdateMowingRecordBody, options?: RequestInit) => Promise<MowingRecord>;
export declare const getUpdateMowingRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMowingRecord>>, TError, {
        id: number;
        data: BodyType<UpdateMowingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMowingRecord>>, TError, {
    id: number;
    data: BodyType<UpdateMowingRecordBody>;
}, TContext>;
export type UpdateMowingRecordMutationResult = NonNullable<Awaited<ReturnType<typeof updateMowingRecord>>>;
export type UpdateMowingRecordMutationBody = BodyType<UpdateMowingRecordBody>;
export type UpdateMowingRecordMutationError = ErrorType<unknown>;
/**
 * @summary Upravit záznam sečení
 */
export declare const useUpdateMowingRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMowingRecord>>, TError, {
        id: number;
        data: BodyType<UpdateMowingRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMowingRecord>>, TError, {
    id: number;
    data: BodyType<UpdateMowingRecordBody>;
}, TContext>;
/**
 * @summary Smazat záznam sečení (soft delete)
 */
export declare const getDeleteMowingRecordUrl: (id: number) => string;
export declare const deleteMowingRecord: (id: number, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeleteMowingRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMowingRecord>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteMowingRecord>>, TError, {
    id: number;
}, TContext>;
export type DeleteMowingRecordMutationResult = NonNullable<Awaited<ReturnType<typeof deleteMowingRecord>>>;
export type DeleteMowingRecordMutationError = ErrorType<unknown>;
/**
 * @summary Smazat záznam sečení (soft delete)
 */
export declare const useDeleteMowingRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteMowingRecord>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteMowingRecord>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Statistiky přehledu
 */
export declare const getGetDashboardStatsUrl: () => string;
export declare const getDashboardStats: (options?: RequestInit) => Promise<DashboardStats>;
export declare const getGetDashboardStatsQueryKey: () => readonly ["/api/dashboard/stats"];
export declare const getGetDashboardStatsQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>>;
export type GetDashboardStatsQueryError = ErrorType<unknown>;
/**
 * @summary Statistiky přehledu
 */
export declare function useGetDashboardStats<TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Posledních 10 záznamů
 */
export declare const getGetRecentRecordsUrl: () => string;
export declare const getRecentRecords: (options?: RequestInit) => Promise<RecentRecords>;
export declare const getGetRecentRecordsQueryKey: () => readonly ["/api/dashboard/recent-records"];
export declare const getGetRecentRecordsQueryOptions: <TData = Awaited<ReturnType<typeof getRecentRecords>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentRecords>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentRecordsQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentRecords>>>;
export type GetRecentRecordsQueryError = ErrorType<unknown>;
/**
 * @summary Posledních 10 záznamů
 */
export declare function useGetRecentRecords<TData = Awaited<ReturnType<typeof getRecentRecords>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Seznam audit logů (admin only)
 */
export declare const getListAuditLogsUrl: (params?: ListAuditLogsParams) => string;
export declare const listAuditLogs: (params?: ListAuditLogsParams, options?: RequestInit) => Promise<AuditLogEntry[]>;
export declare const getListAuditLogsQueryKey: (params?: ListAuditLogsParams) => readonly ["/api/audit-logs", ...ListAuditLogsParams[]];
export declare const getListAuditLogsQueryOptions: <TData = Awaited<ReturnType<typeof listAuditLogs>>, TError = ErrorType<unknown>>(params?: ListAuditLogsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAuditLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAuditLogs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAuditLogsQueryResult = NonNullable<Awaited<ReturnType<typeof listAuditLogs>>>;
export type ListAuditLogsQueryError = ErrorType<unknown>;
/**
 * @summary Seznam audit logů (admin only)
 */
export declare function useListAuditLogs<TData = Awaited<ReturnType<typeof listAuditLogs>>, TError = ErrorType<unknown>>(params?: ListAuditLogsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAuditLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Detail audit logu
 */
export declare const getGetAuditLogUrl: (id: number) => string;
export declare const getAuditLog: (id: number, options?: RequestInit) => Promise<AuditLogEntry>;
export declare const getGetAuditLogQueryKey: (id: number) => readonly [`/api/audit-logs/${number}`];
export declare const getGetAuditLogQueryOptions: <TData = Awaited<ReturnType<typeof getAuditLog>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAuditLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAuditLog>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAuditLogQueryResult = NonNullable<Awaited<ReturnType<typeof getAuditLog>>>;
export type GetAuditLogQueryError = ErrorType<unknown>;
/**
 * @summary Detail audit logu
 */
export declare function useGetAuditLog<TData = Awaited<ReturnType<typeof getAuditLog>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAuditLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Denní záznamy subdodavatelů pro vlastní firmu nebo admina
 */
export declare const getListSubcontractorDailyRecordsUrl: (params?: ListSubcontractorDailyRecordsParams) => string;
export declare const listSubcontractorDailyRecords: (params?: ListSubcontractorDailyRecordsParams, options?: RequestInit) => Promise<SubcontractorDailyRecord[]>;
export declare const getListSubcontractorDailyRecordsQueryKey: (params?: ListSubcontractorDailyRecordsParams) => readonly ["/api/subcontractor-daily-records", ...ListSubcontractorDailyRecordsParams[]];
export declare const getListSubcontractorDailyRecordsQueryOptions: <TData = Awaited<ReturnType<typeof listSubcontractorDailyRecords>>, TError = ErrorType<unknown>>(params?: ListSubcontractorDailyRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubcontractorDailyRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSubcontractorDailyRecords>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSubcontractorDailyRecordsQueryResult = NonNullable<Awaited<ReturnType<typeof listSubcontractorDailyRecords>>>;
export type ListSubcontractorDailyRecordsQueryError = ErrorType<unknown>;
/**
 * @summary Denní záznamy subdodavatelů pro vlastní firmu nebo admina
 */
export declare function useListSubcontractorDailyRecords<TData = Awaited<ReturnType<typeof listSubcontractorDailyRecords>>, TError = ErrorType<unknown>>(params?: ListSubcontractorDailyRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubcontractorDailyRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Vytvořit denní záznam vlastní subdodavatelské firmy
 */
export declare const getCreateSubcontractorDailyRecordUrl: () => string;
export declare const createSubcontractorDailyRecord: (upsertSubcontractorDailyRecordBody: UpsertSubcontractorDailyRecordBody, options?: RequestInit) => Promise<SubcontractorDailyRecord>;
export declare const getCreateSubcontractorDailyRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubcontractorDailyRecord>>, TError, {
        data: BodyType<UpsertSubcontractorDailyRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSubcontractorDailyRecord>>, TError, {
    data: BodyType<UpsertSubcontractorDailyRecordBody>;
}, TContext>;
export type CreateSubcontractorDailyRecordMutationResult = NonNullable<Awaited<ReturnType<typeof createSubcontractorDailyRecord>>>;
export type CreateSubcontractorDailyRecordMutationBody = BodyType<UpsertSubcontractorDailyRecordBody>;
export type CreateSubcontractorDailyRecordMutationError = ErrorType<unknown>;
/**
 * @summary Vytvořit denní záznam vlastní subdodavatelské firmy
 */
export declare const useCreateSubcontractorDailyRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubcontractorDailyRecord>>, TError, {
        data: BodyType<UpsertSubcontractorDailyRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSubcontractorDailyRecord>>, TError, {
    data: BodyType<UpsertSubcontractorDailyRecordBody>;
}, TContext>;
/**
 * @summary Upravit vlastní denní záznam subdodavatele
 */
export declare const getUpdateSubcontractorDailyRecordUrl: (id: number) => string;
export declare const updateSubcontractorDailyRecord: (id: number, upsertSubcontractorDailyRecordBody: UpsertSubcontractorDailyRecordBody, options?: RequestInit) => Promise<SubcontractorDailyRecord>;
export declare const getUpdateSubcontractorDailyRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubcontractorDailyRecord>>, TError, {
        id: number;
        data: BodyType<UpsertSubcontractorDailyRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSubcontractorDailyRecord>>, TError, {
    id: number;
    data: BodyType<UpsertSubcontractorDailyRecordBody>;
}, TContext>;
export type UpdateSubcontractorDailyRecordMutationResult = NonNullable<Awaited<ReturnType<typeof updateSubcontractorDailyRecord>>>;
export type UpdateSubcontractorDailyRecordMutationBody = BodyType<UpsertSubcontractorDailyRecordBody>;
export type UpdateSubcontractorDailyRecordMutationError = ErrorType<unknown>;
/**
 * @summary Upravit vlastní denní záznam subdodavatele
 */
export declare const useUpdateSubcontractorDailyRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubcontractorDailyRecord>>, TError, {
        id: number;
        data: BodyType<UpsertSubcontractorDailyRecordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSubcontractorDailyRecord>>, TError, {
    id: number;
    data: BodyType<UpsertSubcontractorDailyRecordBody>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map