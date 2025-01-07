import React, { useState, useEffect } from "react";
import { Button, Input, Table, Card } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import { Checkbox } from "antd";
import type { CheckboxProps } from "antd";
type TableRowSelection<T extends object = object> =
  TableProps<T>["rowSelection"];

interface DataType {
  key: React.Key;
  Marca: string;
  Modelo: string;
  Valor: number;
  Pais: string;
  Año: number;
  Especificaciones: string;
}

const columns: TableColumnsType<DataType> = [
  { title: "Marca", dataIndex: "Marca" },
  { title: "Modelo", dataIndex: "Modelo" },
  { title: "Año", dataIndex: "Año" },
  {
    title: "Valor (USD)",
    dataIndex: "Valor",
    render: (value: number) => new Intl.NumberFormat("en-US").format(value),
  },
  { title: "Pais", dataIndex: "Pais" },
  { title: "Especificaciones", dataIndex: "Especificaciones" },
];
const onChange: CheckboxProps["onChange"] = (e) => {
  console.log(`checked = ${e.target.checked}`);
};
const App: React.FC = () => {
  const [data, setData] = useState<DataType[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<DataType[]>([]);
  const [filters, setFilters] = useState({ marca: "", modelo: "", year: "" });
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, value]) => value.trim() !== "")
      );
      const response = await fetch(`http://localhost:3000/vehicles?${params}`);
      const result = await response.json();
      if (result.success) {
        setData(
          result.data.map((item: any, index: number) => ({
            key: index,
            Marca: item.Marca,
            Modelo: item.Modelo,
            Año: item.Año,
            Valor: parseFloat(item.Valor),
            Pais: item.Pais,
            Especificaciones: item.Especificaciones,
          }))
        );
      } else {
        console.error("Error: No se obtuvieron los vehículos.");
      }
    } catch (error) {
      console.error("Error en la petición de vehículos:", error);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch("http://localhost:3000/exchange-rate");
      const result = await response.json();
      if (result.success && result.rate) {
        setExchangeRate(result.rate);
      } else {
        console.error("Error: No se obtuvo una tasa de cambio válida.");
      }
    } catch (error) {
      console.error("Error obteniendo la tasa de cambio:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchExchangeRate();
  }, [filters]);

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  };

  const calculateTaxes = (vehicle: DataType) => {
    const placa = vehicle.Valor * 0.17;
    const co2 = vehicle.Valor * 0.03;
    const itbis = vehicle.Valor * 0.18;
    const gravamen = vehicle.Valor * 0.2;
    const marbete = 3000;
    const totalImpuestos = gravamen + itbis + co2;
    const totalGeneral = vehicle.Valor + totalImpuestos + placa;

    return {
      Placa: placa,
      CO2: co2,
      ITBIS: itbis,
      Gravamen: gravamen,
      TotalImpuestos: totalImpuestos,
      TotalGeneral: totalGeneral,
      marbete: marbete,
    };
  };

  const calculatePriceInDOP = (priceInUSD: number) => {
    if (exchangeRate === 0) return "Tasa de cambio no disponible";
    return formatCurrency(priceInUSD * exchangeRate, "DOP");
  };

  const clearSelection = () => {
    setSelectedRowKeys([]);
    setSelectedVehicles([]);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    const selected = data.filter((item) =>
      newSelectedRowKeys.includes(item.key)
    );
    setSelectedVehicles(selected);
  };

  const rowSelection: TableRowSelection<DataType> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };
  // estados unidos no paga gravamen
  // precio por defaul o ingresado
  return (
    <div
      style={{ padding: "16px", background: "#85858e", borderRadius: "10px" }}
    >
      <div style={{ marginBottom: "16px", display: "flex", gap: "10px" }}>
        <Input
          placeholder="Buscar por Marca"
          value={filters.marca}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, marca: e.target.value }))
          }
        />
        <Input
          placeholder="Buscar por Modelo"
          value={filters.modelo}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, modelo: e.target.value }))
          }
        />
        <Input
          placeholder="Buscar por Año"
          value={filters.year}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, year: e.target.value }))
          }
        />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <Button type="primary" onClick={clearSelection}>
          Limpiar resultados
        </Button>
        {selectedRowKeys.length > 0 && (
          <span style={{ marginLeft: "22px" }}>
            Vehículos seleccionados: {selectedRowKeys.length}
          </span>
        )}
        <span style={{ padding: "10px" }}>Calculo de Co2.</span>
        <Checkbox onChange={onChange} style={{ padding: "10px" }}>
          0.00
        </Checkbox>
        <Checkbox onChange={onChange} style={{ padding: "10px" }}>
          0.01
        </Checkbox>
        <Checkbox onChange={onChange} style={{ padding: "10px" }}>
          0.03
        </Checkbox>
      </div>
      <Table<DataType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
      />
      {selectedVehicles.length > 0 && (
        <Card title="Resultados de los cálculos" style={{ marginTop: "16px" }}>
          {selectedVehicles.map((vehicle, index) => {
            const taxes = calculateTaxes(vehicle);
            const priceInDOP = calculatePriceInDOP(taxes.TotalGeneral);
            return (
              <div key={index}>
                <p>
                  <b>
                    {vehicle.Marca} {vehicle.Modelo} ({vehicle.Año}){" "}
                    {vehicle.Pais}
                  </b>
                </p>
                <p>Valor del vehículo: {formatCurrency(vehicle.Valor)}</p>
                <p>Gravamen ${taxes.Gravamen}</p>
                <p>Itbis ${taxes.ITBIS}</p>
                <p> C02 ${taxes.CO2}</p>
                <p>Placa: {formatCurrency(taxes.Placa)}</p>
                <p>Marbete: {taxes.marbete}</p>
                <p>
                  Total de Impuestos : {formatCurrency(taxes.TotalImpuestos)}
                </p>
                <p>
                  <b>
                    Total General (Incluye Valor e Impuestos):{" "}
                    {formatCurrency(taxes.TotalGeneral)}
                  </b>
                </p>
                <p>
                  <b>Precio en DOP: {priceInDOP}</b>
                </p>
                <hr></hr>
                <br></br>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};

export default App;
