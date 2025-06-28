"use client";
import {
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";

interface Parameter {
  id: number;
  value: string;
  type: string;
}

interface TypeParameter {
  id: number;
  name: string;
  value: string;
}

const MoveExecutor: React.FC = () => {
  const [movePackage, setMovePackage] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [typeParameters, setTypeParameters] = useState<TypeParameter[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [functions, setFunctions] = useState<string[]>([]);
  const [nextId, setNextId] = useState<number>(0);
  const [nextTypeId, setNextTypeId] = useState<number>(0);
  const [shouldQuery, setShouldQuery] = useState<boolean>(false);
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          // Raw effects are required so the effects can be reported back to the wallet
          showRawEffects: true,
          // Select additional data to return
          showObjectChanges: true,
        },
      }),
  });

  // Validate hex input
  const validateHex = (input: string) => {
    return /^(0x)?[0-9a-fA-F]*$/.test(input);
  };

  const handleMovePackageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateHex(value)) {
      setMovePackage(value);
      setSelectedModule(""); // Reset module when package changes
      setSelectedFunction(""); // Reset function when package changes
      setModules([]); // Clear modules
      setFunctions([]); // Clear functions
      setShouldQuery(false); // Reset query state when package changes
    }
  };

  const queryResult = useSuiClientQuery(
    "getNormalizedMoveModulesByPackage",
    {
      package: movePackage,
    },
    {
      enabled: shouldQuery && movePackage.length > 0,
    }
  );

  if (!queryResult?.isPending && queryResult.data && shouldQuery) {
    console.log(queryResult.data);
    // Extract module names from the query result
    const moduleNames = [];
    for (const key in queryResult.data) {
      moduleNames.push(key);
    }
    setModules(moduleNames);
    setShouldQuery(false); // Reset query state after processing
  }

  const handleQueryPackage = () => {
    if (movePackage.trim()) {
      setShouldQuery(true);
      console.log(`Querying package: ${movePackage}`);
      // The actual query will be triggered by the useSuiClientQuery hook
      // when shouldQuery becomes true
    }
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    setSelectedModule(moduleName);
    setSelectedFunction(""); // Reset function when module changes
    setParameters([]); // Reset parameters when module changes
    setTypeParameters([]); // Reset type parameters when module changes

    if (moduleName && queryResult.data) {
      // Extract functions from the selected module
      const functions = queryResult.data[moduleName]?.exposedFunctions;
      setFunctions(functions ? Object.keys(functions) : []);
    } else {
      setFunctions([]);
    }
  };

  const handleFunctionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFunction(e.target.value);
    const allParams =
      queryResult.data?.[selectedModule]?.exposedFunctions?.[e.target.value]
        ?.parameters;

    // Separate type parameters from regular parameters
    const typeParams: any[] = [];
    const operatingParams =
      allParams?.filter((param: any, index: number) => {
        // Check for type parameters
        if (param.TypeParameter !== undefined) {
          typeParams.push({ index, param });
          return false;
        }

        // Exclude TxContext parameters
        if (
          param?.MutableReference?.Struct?.module === "tx_context" &&
          param?.MutableReference?.Struct?.name === "TxContext"
        ) {
          return false;
        }

        return true;
      }) || [];

    console.log("Type parameters:", typeParams);
    console.log("Operating parameters:", operatingParams);

    // Auto-populate type parameters
    if (typeParams.length > 0) {
      const newTypeParameters = typeParams.map(
        (typeParam: any, index: number) => ({
          id: nextTypeId + index,
          name: `T${typeParam.param.TypeParameter}`,
          value: "",
        })
      );

      setTypeParameters(newTypeParameters);
      setNextTypeId(nextTypeId + typeParams.length);
    } else {
      setTypeParameters([]);
    }

    // Auto-populate regular parameters
    if (operatingParams.length > 0) {
      const newParameters = operatingParams.map(
        (param: any, index: number) => ({
          id: nextId + index,
          value: "",
          type: getParameterType(param),
        })
      );

      setParameters(newParameters);
      setNextId(nextId + operatingParams.length);
    } else {
      setParameters([]);
    }
  };

  // Helper function to determine parameter type from the parameter object
  const getParameterType = (param: any): string => {
    // Handle pure type strings (like "U64", "Bool", etc.)
    if (typeof param === "string") {
      return param
    }

    if (param.TypeParameter !== undefined) {
      return "T"; // Generic type parameter
    }

    if (param.Reference?.Struct) {
      const struct = param.Reference.Struct;
      return `&${struct.module}::${struct.name}`;
    }

    if (param.MutableReference?.Struct) {
      const struct = param.MutableReference.Struct;
      return `&mut ${struct.module}::${struct.name}`;
    }

    if (param.Struct) {
      const struct = param.Struct;
      if (struct.module === "string" && struct.name === "String") {
        return "string";
      }
      return `${struct.module}::${struct.name}`;
    }

    return "unknown";
  };

  const addParameter = () => {
    setParameters([...parameters, { id: nextId, value: "", type: "string" }]);
    setNextId(nextId + 1);
  };

  const updateParameterValue = (id: number, value: string) => {
    setParameters(
      parameters.map((param) => (param.id === id ? { ...param, value } : param))
    );
  };

  const updateParameterType = (id: number, type: string) => {
    setParameters(
      parameters.map((param) => (param.id === id ? { ...param, type } : param))
    );
  };

  const removeParameter = (id: number) => {
    setParameters(parameters.filter((param) => param.id !== id));
  };

  const addTypeParameter = () => {
    setTypeParameters([
      ...typeParameters,
      {
        id: nextTypeId,
        name: `T${nextTypeId}`,
        value: "",
      },
    ]);
    setNextTypeId(nextTypeId + 1);
  };

  const updateTypeParameterValue = (id: number, value: string) => {
    setTypeParameters(
      typeParameters.map((param) =>
        param.id === id ? { ...param, value } : param
      )
    );
  };

  const removeTypeParameter = (id: number) => {
    setTypeParameters(typeParameters.filter((param) => param.id !== id));
  };

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    const T = new Transaction();
    
    // Build arguments array based on parameter types
    const buildArguments = () => {
      return parameters.map(param => {
        const { value, type } = param;
        
        // Handle string type
        if (type === "string") {
          return T.pure.string(value);
        }
        
        // Handle pure types (primitives)
        if (["u8", "u16", "u32", "u64", "u128", "u256", "U8", "U16", "U32", "U64", "U128", "U256"].includes(type)) {
          const lowerType = type.toLowerCase() as "u8" | "u16" | "u32" | "u64" | "u128" | "u256";
          return T.pure[lowerType](Number(value));
        }
        
        if (type === "bool" || type === "Bool") {
          return T.pure.bool(value === "true" || value === "1");
        }
        
        if (type === "address" || type === "Address") {
          return T.pure.address(value);
        }
        
        // Handle objects (references, mutable references, or complex structs)
        // These are typically hex strings representing object IDs
        if (type.startsWith("&") || type.includes("::")) {
          return T.object(value); // Use T.object() for object references
        }
        
        // Default fallback for unknown types - treat as object
        return T.object(value);
      });
    };
    
    T.moveCall({
        target: `${movePackage}::${selectedModule}::${selectedFunction}`,
        typeArguments: typeParameters.map((tp) => tp.value),
        arguments: buildArguments()
    });
    
    console.log("Executing:", {
      movePackage,
      selectedModule,
      selectedFunction,
      typeParameters: typeParameters.map((tp) => ({ name: tp.name, value: tp.value })),
      parameters: parameters.map((p) => ({ value: p.value, type: p.type })),
    });
    
    signAndExecuteTransaction(
      {
        transaction: T,
      },
      {
        onSuccess: (result) => {
          console.log("result", result);
        },
      }
    );
  };
  return (
    <div className="w-fit min-w-80">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 backdrop-blur-sm bg-opacity-95">
        <div className="border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Move Function Executor
          </h2>
        </div>

        <form onSubmit={handleExecute} className="space-y-5">
          {/* Move Package Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Move Package
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter hex address"
                value={movePackage}
                onChange={handleMovePackageChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleQueryPackage}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Query
              </button>
            </div>
          </div>

          {/* Module Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Module
            </label>
            <select
              onChange={handleModuleChange}
              value={selectedModule}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Select module</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>

          {/* Function Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Function to Use
            </label>
            <select
              onChange={handleFunctionChange}
              value={selectedFunction}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Select function</option>
              {functions.map((func) => (
                <option key={func} value={func}>
                  {func}
                </option>
              ))}
            </select>
          </div>

          {/* Type Parameters Section */}
          {typeParameters.length > 0 && (
            <>
              <div className="relative">
                <div className="border-t border-gray-200 my-6"></div>
                <span className="absolute top-[-12px] left-0 bg-white px-3 text-sm font-medium text-gray-500">
                  Type Parameters
                </span>
              </div>

              <div className="space-y-3">
                {typeParameters.map((typeParam) => (
                  <div key={typeParam.id} className="flex gap-2">
                    <span className="flex items-center px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-700 min-w-16">
                      {typeParam.name}
                    </span>
                    <input
                      type="text"
                      placeholder="Type value (e.g., 0x2::sui::SUI)"
                      value={typeParam.value}
                      onChange={(e) =>
                        updateTypeParameterValue(typeParam.id, e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeTypeParameter(typeParam.id)}
                      className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="Remove type parameter"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Type Parameter Button */}
              <button
                type="button"
                onClick={addTypeParameter}
                className="w-full py-2 px-4 border-2 border-dashed border-purple-300 text-purple-600 rounded-md hover:border-purple-400 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              >
                + Add Type Parameter
              </button>
            </>
          )}

          {/* Parameters Section */}
          <div className="relative">
            <div className="border-t border-gray-200 my-6"></div>
            <span className="absolute top-[-12px] left-0 bg-white px-3 text-sm font-medium text-gray-500">
              Parameters
            </span>
          </div>

          {/* Parameter Inputs */}
          <div className="space-y-3">
            {parameters.map((param) => (
              <div key={param.id} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Parameter value"
                  value={param.value}
                  onChange={(e) =>
                    updateParameterValue(param.id, e.target.value)
                  }
                  className="flex-[3] px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <input
                  type="text"
                  readOnly
                  placeholder="Type (e.g., u64, bool, address)"
                  value={param.type}
                  onChange={(e) =>
                    updateParameterType(param.id, e.target.value)
                  }
                  className="flex-[2] px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeParameter(param.id)}
                  className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Remove parameter"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add Parameter Button */}
          <button
            type="button"
            onClick={addParameter}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 text-gray-600 rounded-md hover:border-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            + Add Parameter
          </button>

          {/* Execute Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            Execute
          </button>
        </form>
      </div>
    </div>
  );
};

export default MoveExecutor;
